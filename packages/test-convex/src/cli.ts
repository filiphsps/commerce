#!/usr/bin/env node
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

import { runDaemon } from './daemon';

const sub = process.argv[2];
const restArgs = process.argv.slice(3);

/**
 * Parses the subcommand's trailing CLI flags against an allowed-options map.
 *
 * @param allowed - Flag names mapped to their `parseArgs` value types.
 * @returns The parsed flag values keyed by flag name.
 */
const argsFor = (allowed: Record<string, { type: 'string' | 'boolean' }>) =>
    parseArgs({ args: restArgs, options: allowed }).values;

/**
 * Boots the persistent dev backend by delegating to {@link runDaemon} with
 * marker-file paths derived from `--dataDir`.
 *
 * @returns Resolves only when the daemon exits.
 */
const cmdStart = async (): Promise<void> => {
    const { dataDir = '.convex-dev', port = '3210' } = argsFor({
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
 * Dispatches the requested subcommand, printing usage and exiting non-zero for
 * unknown commands.
 *
 * @returns Resolves once the dispatched subcommand settles.
 * @throws When a recognized-but-unimplemented subcommand is invoked.
 */
const main = async (): Promise<void> => {
    switch (sub) {
        case 'start':
            return cmdStart();
        case 'stop':
        case 'reset':
        case 'seed':
            // TODO(HARNESS-02): wire --url into seed
            throw new Error(`@nordcom/commerce-test-convex: cli "${sub}" is not implemented yet (HARNESS-02).`);
        default:
            console.error('usage: test-convex {start|stop|reset|seed} [--dataDir path] [--port n] [--url ...]');
            process.exit(1);
    }
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
