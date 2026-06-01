#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { runDaemon } from './daemon';
import { resolveConvexStateDir } from './start';

/**
 * Reports whether a process with the given PID is alive, using signal `0`
 * (which performs the permission/existence check without delivering a signal).
 *
 * @param pid - Process id to probe.
 * @returns `true` when the process exists and is signalable, else `false`.
 */
const isAlive = (pid: number): boolean => {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
};

/**
 * Parses a subcommand's trailing CLI flags against an allowed-options map.
 *
 * @param args - The trailing argv tokens after the subcommand.
 * @param allowed - Flag names mapped to their `parseArgs` value types.
 * @returns The parsed flag values keyed by flag name.
 */
const argsFor = (args: string[], allowed: Record<string, { type: 'string' | 'boolean' }>) =>
    parseArgs({ args, options: allowed }).values;

/**
 * Boots the persistent dev backend by delegating to {@link runDaemon} with
 * marker-file paths derived from `--dataDir`. Idles until a signal stops it.
 *
 * @param args - Trailing argv after the `start` subcommand.
 * @returns Resolves only when the daemon exits.
 */
const cmdStart = async (args: string[]): Promise<void> => {
    const { dataDir = '.convex-dev', port = '3210' } = argsFor(args, {
        dataDir: { type: 'string' },
        port: { type: 'string' },
    });
    await runDaemon({
        dataDir: resolve(String(dataDir)),
        port: Number(port),
        pidFile: resolve(String(dataDir), '.pid'),
        urlFile: resolve(String(dataDir), '.url'),
        adminKeyFile: resolve(String(dataDir), '.admin-key'),
    });
};

/**
 * Stops a running dev daemon by SIGTERM-ing the PID recorded in `--dataDir`.
 * No-op when the marker is absent; prunes the marker when it is stale.
 *
 * @param args - Trailing argv after the `stop` subcommand.
 */
const cmdStop = (args: string[]): void => {
    const { dataDir = '.convex-dev' } = argsFor(args, { dataDir: { type: 'string' } });
    const pidPath = resolve(String(dataDir), '.pid');
    if (!existsSync(pidPath)) {
        console.info('[test-convex] no PID file; daemon already stopped');
        return;
    }
    const pid = Number(readFileSync(pidPath, 'utf8'));
    if (!isAlive(pid)) {
        console.info('[test-convex] PID file is stale; removing');
        rmSync(pidPath, { force: true });
        return;
    }
    process.kill(pid, 'SIGTERM');
    console.info(`[test-convex] sent SIGTERM to pid ${pid}`);
};

/**
 * Stops the daemon, then wipes both the marker `--dataDir` and the project-local
 * Convex state directory (`<projectDir>/.convex`) so the next start provisions a
 * fresh backend.
 *
 * @param args - Trailing argv after the `reset` subcommand.
 */
const cmdReset = (args: string[]): void => {
    cmdStop(args);
    const { dataDir = '.convex-dev' } = argsFor(args, { dataDir: { type: 'string' } });
    rmSync(resolve(String(dataDir)), { recursive: true, force: true });
    const stateDir = resolveConvexStateDir();
    rmSync(stateDir, { recursive: true, force: true });
    console.info(`[test-convex] removed ${dataDir} and ${stateDir}`);
};

/**
 * Seeds canonical fixtures into a running deployment. Resolves the admin key
 * from `--adminKey` or the `.admin-key` marker under `--dataDir` and exposes the
 * deployment to the seed client through the self-hosted Convex environment
 * variables before delegating to `seedCanonical`.
 *
 * @param args - Trailing argv after the `seed` subcommand.
 * @returns Resolves once seeding completes; resolves to `1` when `--url` is missing.
 */
const cmdSeed = async (args: string[]): Promise<number> => {
    const { url, adminKey, dataDir = '.convex-dev' } = argsFor(args, {
        url: { type: 'string' },
        adminKey: { type: 'string' },
        dataDir: { type: 'string' },
    });
    if (!url) {
        console.error('[test-convex] --url is required');
        return 1;
    }

    let key = adminKey ? String(adminKey) : '';
    if (!key) {
        const markerPath = resolve(String(dataDir), '.admin-key');
        if (existsSync(markerPath)) key = readFileSync(markerPath, 'utf8').trim();
    }
    process.env.CONVEX_SELF_HOSTED_URL = String(url);
    if (key) process.env.CONVEX_SELF_HOSTED_ADMIN_KEY = key;

    // Lazy import: the seed chain pulls in the Convex client + schema. Keeping
    // it out of the start/stop/reset paths means the CLI never connects to a
    // deployment just to dispatch one of those subcommands.
    const { seedCanonical } = await import('./seed/canonical');
    await seedCanonical(String(url));
    return 0;
};

/**
 * Dispatches a `test-convex` subcommand and returns its process exit code.
 * Returning a code (rather than calling `process.exit`) keeps the dispatcher
 * importable and unit-testable without tearing down the test runner.
 *
 * @param argv - Argv excluding the node binary and script path (`process.argv.slice(2)`).
 * @returns The exit code: `0` on success, `1` for usage errors.
 */
export async function runCli(argv: string[]): Promise<number> {
    const sub = argv[0];
    const rest = argv.slice(1);
    switch (sub) {
        case 'start':
            await cmdStart(rest);
            return 0;
        case 'stop':
            cmdStop(rest);
            return 0;
        case 'reset':
            cmdReset(rest);
            return 0;
        case 'seed':
            return cmdSeed(rest);
        default:
            console.error('usage: test-convex {start|stop|reset|seed} [--dataDir path] [--port n] [--url ...] [--adminKey ...]');
            return 1;
    }
}

/**
 * Determines whether this module is the program entry point (the bin script)
 * rather than an import (e.g. from a test), so the dispatcher only auto-runs
 * when invoked as `test-convex`.
 *
 * @returns `true` when executed directly as the CLI entry point.
 */
const isMain = (): boolean => {
    const entry = process.argv[1];
    if (!entry) return false;
    try {
        return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
    } catch {
        return false;
    }
};

if (isMain()) {
    runCli(process.argv.slice(2))
        .then((code) => {
            if (code !== 0) process.exit(code);
        })
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
