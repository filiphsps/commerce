import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { type AddressInfo, createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ConvexError } from 'convex/values';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const requireFromHere = createRequire(import.meta.url);

/** Max time to wait for the local backend's `/instance_name` readiness probe to succeed before failing the boot. */
const DEFAULT_READY_TIMEOUT_MS = 60_000;
/** Interval between `/instance_name` readiness probes while the backend boots. */
const READY_POLL_INTERVAL_MS = 250;
/** Grace period a `stop()` waits for the backend to exit on SIGTERM before escalating to SIGKILL. */
const STOP_TIMEOUT_MS = 5_000;
/** Best-effort window to wait for the CLI to persist the deployment admin key after the backend is reachable. */
const ADMIN_KEY_TIMEOUT_MS = 5_000;

/**
 * Options for {@link startConvex}. All fields are optional; omitting them
 * starts an ephemeral local Convex backend that is torn down on `stop()`.
 *
 * @example
 * ```ts
 * // Ephemeral — for integration tests:
 * const convex = await startConvex();
 *
 * // Persistent — for pnpm dev:
 * const convex = await startConvex({ dataDir: '.convex-dev', port: 3210 });
 * ```
 */
export interface StartConvexOptions {
    /** When set, the backend persists its data to this directory and survives `.stop()`. */
    dataDir?: string;
    /** Fixed port. Useful with `dataDir` so re-attaches hit the same deployment URL. */
    port?: number;
}

/**
 * Handle returned by {@link startConvex}. Carries the deployment URL and the
 * admin key needed to authenticate writes, plus a `stop()` method that cleanly
 * shuts the backend down, optionally removing the on-disk data directory.
 *
 * @example
 * ```ts
 * const { url, adminKey, stop } = await startConvex();
 * // pass url + adminKey to a ConvexClient or the seed helpers
 * await stop();
 * ```
 */
export interface StartedConvex {
    /** Deployment URL the Convex client and seed helpers connect to. */
    url: string;
    /** Admin key authenticating privileged operations against the deployment. */
    adminKey: string;
    /** Gracefully shuts down the backend, preserving `dataDir` when one was given. */
    stop: () => Promise<void>;
}

/**
 * Bookkeeping for a single spawned `convex dev` process this Node process owns.
 * `child` is the process-group leader; `stateDir` is the project-local Convex
 * state directory the backend persists to; `cleanup` is `true` for ephemeral
 * instances whose state directory should be wiped on `stop()`.
 */
interface BackendRecord {
    child: ChildProcess;
    stateDir: string;
    cleanup: boolean;
}

// Module-level registry of every backend this process owns, so the
// signal/exit handlers below can reach each running `convex dev` group even
// when the test that owns it dies mid-flight (vitest worker death, Ctrl-C,
// uncaught rejection). Without this we leak orphan `convex-local-backend`
// processes — the very failure mode the retired in-process Mongo harness was built to avoid.
const activeBackends = new Set<BackendRecord>();

let handlersInstalled = false;

/**
 * Resolves the Convex project directory (the one holding `convex.json` and the
 * `convex/` functions) the local backend pushes. Honors `CONVEX_PROJECT_DIR`
 * for overrides; otherwise resolves the sibling `@nordcom/commerce-convex`
 * package next to this one.
 *
 * @returns Absolute path to the Convex project directory.
 */
export function resolveConvexProjectDir(): string {
    const override = process.env.CONVEX_PROJECT_DIR;
    if (override) return resolve(override);
    return resolve(moduleDir, '../../convex');
}

/**
 * Resolves the project-local Convex state directory (`<projectDir>/.convex`)
 * the local/anonymous backend persists its SQLite database, storage, and
 * deployment config into. This is the directory `reset` wipes.
 *
 * @param projectDir - Convex project directory; defaults to {@link resolveConvexProjectDir}.
 * @returns Absolute path to the `.convex` state directory.
 */
export function resolveConvexStateDir(projectDir: string = resolveConvexProjectDir()): string {
    return resolve(projectDir, '.convex');
}

/**
 * Sleeps for the given duration without keeping the event loop alive.
 *
 * @param ms - Milliseconds to wait.
 * @returns Resolves after `ms` milliseconds.
 */
function delay(ms: number): Promise<void> {
    return new Promise((res) => {
        setTimeout(res, ms).unref();
    });
}

/**
 * Asks the OS for an unused TCP port by binding to port 0 on the loopback
 * interface, reading the assigned port, then releasing it. Used for ephemeral
 * backends so concurrent harnesses don't collide on the pinned dev port.
 *
 * @returns A port number that was free at the moment of the call.
 * @throws {ConvexError} When the OS does not return a numeric port.
 */
function pickFreePort(): Promise<number> {
    return new Promise((resolvePort, reject) => {
        const srv = createServer();
        srv.unref();
        srv.on('error', reject);
        srv.listen(0, '127.0.0.1', () => {
            const address = srv.address() as AddressInfo | null;
            if (address && typeof address === 'object') {
                const { port } = address;
                srv.close(() => resolvePort(port));
            } else {
                srv.close(() => reject(new ConvexError('[test-convex] failed to acquire a free port')));
            }
        });
    });
}

/**
 * Resolves the absolute path to the bundled `convex` CLI entry point. Resolved
 * via the package's `package.json` because `convex/bin/main.js` is not listed
 * in the package `exports` map, so `require.resolve` of the subpath fails.
 *
 * @returns Absolute path to `convex/bin/main.js`.
 */
function resolveConvexBin(): string {
    return resolve(dirname(requireFromHere.resolve('convex/package.json')), 'bin', 'main.js');
}

/**
 * Reads the configured startup timeout, honoring the same
 * `CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS` override the Convex CLI uses so a
 * cold binary download on first boot doesn't trip a false failure.
 *
 * @returns The readiness timeout in milliseconds.
 */
function readyTimeoutMs(): number {
    const raw = process.env.CONVEX_LOCAL_BACKEND_STARTUP_TIMEOUT_SECS;
    if (raw) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed) && parsed > 0) return parsed * 1000;
    }
    return DEFAULT_READY_TIMEOUT_MS;
}

/**
 * Best-effort read of the deployment admin key the Convex CLI persists to the
 * project-local deployment config once it provisions the backend.
 *
 * @param stateDir - The `.convex` state directory the CLI writes config into.
 * @returns The admin key, or an empty string when it is not yet available.
 */
function readAdminKey(stateDir: string): string {
    const configPath = resolve(stateDir, 'local', 'default', 'config.json');
    if (!existsSync(configPath)) return '';
    try {
        const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as { adminKey?: unknown };
        return typeof parsed.adminKey === 'string' ? parsed.adminKey : '';
    } catch {
        // Config half-written or malformed mid-boot; treat as not-yet-available.
        return '';
    }
}

/**
 * Sends `signal` to the entire process group led by `child` so the spawned
 * `convex dev` and its `convex-local-backend` grandchild both die. Falls back
 * to signaling the lone PID when the group kill is rejected (e.g. the leader
 * already exited).
 *
 * @param child - The detached `convex dev` process (its own group leader).
 * @param signal - Signal to deliver to the group.
 */
function killBackend(child: ChildProcess, signal: NodeJS.Signals): void {
    const { pid } = child;
    if (pid === undefined) return;
    try {
        process.kill(-pid, signal);
    } catch {
        try {
            process.kill(pid, signal);
        } catch {
            // Process already gone, nothing to do.
        }
    }
}

/**
 * Stops a tracked backend: removes it from the registry, SIGTERMs its process
 * group, waits up to {@link STOP_TIMEOUT_MS} for a clean exit before escalating
 * to SIGKILL, then wipes the state directory for ephemeral instances.
 *
 * @param record - The backend bookkeeping record to tear down.
 * @returns Resolves once the backend has exited and any cleanup has run.
 */
async function stopRecord(record: BackendRecord): Promise<void> {
    activeBackends.delete(record);
    const { child, stateDir, cleanup } = record;

    if (child.exitCode === null && child.signalCode === null) {
        await new Promise<void>((res) => {
            let settled = false;
            const done = (): void => {
                if (settled) return;
                settled = true;
                res();
            };
            child.once('exit', done);
            killBackend(child, 'SIGTERM');
            setTimeout(() => {
                killBackend(child, 'SIGKILL');
                done();
            }, STOP_TIMEOUT_MS).unref();
        });
    }

    if (cleanup) {
        try {
            rmSync(stateDir, { recursive: true, force: true });
        } catch {
            // Best-effort: the next start re-provisions the state directory anyway.
        }
    }
}

/**
 * Registers signal and exit handlers so every backend tracked in
 * `activeBackends` is stopped when the current process exits — preventing
 * orphan `convex-local-backend` processes when vitest workers crash or uncaught
 * exceptions bypass a test's `afterAll`. Mirrors the retired Mongo harness's registry:
 * async stop on signals/uncaught, synchronous SIGKILL on hard `exit`.
 */
function installShutdownHandlers(): void {
    if (handlersInstalled) return;
    handlersInstalled = true;

    const asyncStopAll = async (): Promise<void> => {
        await Promise.allSettled(Array.from(activeBackends).map((record) => stopRecord(record)));
    };

    const syncKillAll = (): void => {
        for (const record of activeBackends) {
            killBackend(record.child, 'SIGKILL');
        }
    };

    const onSignal = (signum: number): void => {
        void asyncStopAll().finally(() => {
            process.exit(128 + signum);
        });
    };

    process.once('SIGINT', () => onSignal(2));
    process.once('SIGTERM', () => onSignal(15));
    process.once('SIGHUP', () => onSignal(1));

    process.on('beforeExit', () => {
        if (activeBackends.size === 0) return;
        void asyncStopAll();
    });

    process.on('exit', () => {
        if (activeBackends.size === 0) return;
        syncKillAll();
    });

    process.on('uncaughtException', (err) => {
        process.stderr.write(`[test-convex] uncaughtException — stopping backends: ${err?.stack ?? err}\n`);
        void asyncStopAll().finally(() => {
            process.exit(1);
        });
    });

    process.on('unhandledRejection', (reason) => {
        process.stderr.write(`[test-convex] unhandledRejection — stopping backends: ${String(reason)}\n`);
        void asyncStopAll().finally(() => {
            process.exit(1);
        });
    });
}

/**
 * Polls the backend's `/instance_name` endpoint until it answers `200`,
 * failing fast if the spawned process exits first or the deadline passes.
 *
 * @param url - Deployment URL to probe.
 * @param getEarlyExit - Returns the child's exit info once it has exited, else `null`.
 * @param deadline - Absolute `Date.now()` timestamp after which to give up.
 * @returns Resolves once the backend is reachable.
 * @throws {ConvexError} When the backend exits before readiness or the deadline elapses.
 */
async function waitForReady(
    url: string,
    getEarlyExit: () => { code: number | null; signal: NodeJS.Signals | null } | null,
    deadline: number,
): Promise<void> {
    while (Date.now() < deadline) {
        const exit = getEarlyExit();
        if (exit) {
            throw new ConvexError(
                `[test-convex] backend exited before becoming ready (code ${exit.code}, signal ${exit.signal})`,
            );
        }
        try {
            const resp = await fetch(`${url}/instance_name`);
            if (resp.status === 200) {
                await resp.text();
                return;
            }
        } catch {
            // Backend not listening yet; keep polling.
        }
        await delay(READY_POLL_INTERVAL_MS);
    }
    throw new ConvexError(`[test-convex] backend did not become ready within ${readyTimeoutMs()}ms at ${url}`);
}

/**
 * Starts a local Convex backend via the bundled `convex dev` CLI in anonymous
 * agent mode and returns its deployment URL, admin key, and a `stop()` handle.
 *
 * The child is spawned detached (its own process group) so `stop()` — and the
 * orphan-proof shutdown handlers — can terminate both `convex dev` and its
 * `convex-local-backend` grandchild in one signal. The inherited
 * `CONVEX_DEPLOYMENT`/`CONVEX_DEPLOY_KEY`/self-hosted variables are blanked so
 * the CLI provisions a throwaway local deployment instead of targeting the
 * project's real cloud deployment. Boot-to-ready latency is logged for the e2e
 * flake budget.
 *
 * @param opts - Optional data-directory and port overrides. When `dataDir` is
 *   set, the project-local state directory is preserved on `stop()`; otherwise
 *   it is wiped so the next ephemeral start is clean.
 * @returns A {@link StartedConvex} with the deployment URL, admin key, and stop handle.
 * @throws {ConvexError} When no port can be acquired or the backend fails to become ready.
 */
export async function startConvex(opts: StartConvexOptions = {}): Promise<StartedConvex> {
    installShutdownHandlers();

    const projectDir = resolveConvexProjectDir();
    const stateDir = resolveConvexStateDir(projectDir);
    const port = opts.port ?? (await pickFreePort());
    const url = `http://127.0.0.1:${port}`;
    const cleanup = opts.dataDir === undefined;

    const startedAt = Date.now();
    console.info(`[test-convex] booting local Convex backend (anonymous, port ${port}, projectDir ${projectDir})`);

    const child = spawn(
        process.execPath,
        [resolveConvexBin(), 'dev', '--local-cloud-port', String(port), '--tail-logs', 'disable'],
        {
            cwd: projectDir,
            detached: true,
            stdio: ['ignore', 'inherit', 'inherit'],
            env: {
                ...process.env,
                CONVEX_AGENT_MODE: 'anonymous',
                // Blank the cloud-deployment selectors `convex dev` would otherwise
                // read from the project's .env.local. dotenv won't overwrite a key
                // that is already present (even when empty), and the CLI treats an
                // empty value as unset — so this forces the anonymous-local path.
                CONVEX_DEPLOYMENT: '',
                CONVEX_DEPLOY_KEY: '',
                CONVEX_SELF_HOSTED_URL: '',
                CONVEX_SELF_HOSTED_ADMIN_KEY: '',
            },
        },
    );

    const record: BackendRecord = { child, stateDir, cleanup };
    activeBackends.add(record);

    let earlyExit: { code: number | null; signal: NodeJS.Signals | null } | null = null;
    child.once('exit', (code, signal) => {
        earlyExit = { code, signal };
    });

    try {
        await waitForReady(url, () => earlyExit, startedAt + readyTimeoutMs());
    } catch (err) {
        await stopRecord(record);
        throw err;
    }

    let adminKey = readAdminKey(stateDir);
    const adminKeyDeadline = Date.now() + ADMIN_KEY_TIMEOUT_MS;
    while (adminKey === '' && Date.now() < adminKeyDeadline) {
        await delay(READY_POLL_INTERVAL_MS);
        adminKey = readAdminKey(stateDir);
    }

    console.info(`[test-convex] backend ready in ${Date.now() - startedAt}ms at ${url}`);

    let stopped = false;
    return {
        url,
        adminKey,
        stop: async () => {
            if (stopped) return;
            stopped = true;
            await stopRecord(record);
        },
    };
}
