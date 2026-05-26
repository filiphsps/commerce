import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { startMongo } from './start';

export interface DaemonOptions {
    dbPath: string;
    port: number;
    pidFile: string;
    uriFile: string;
}

/**
 * Long-running foreground process: spins up mongod via `startMongo`, writes
 * PID + URI files, and waits for SIGTERM/SIGINT. Used by `pnpm dev:mongo`
 * directly and indirectly by `scripts/mongo-daemon.mjs` (which spawns this
 * detached for `pnpm dev`).
 *
 * `startMongo` already installs orphan-proof signal handlers; the additional
 * handler here only removes the on-disk PID/URI marker files so the next
 * `predev-mongo` run sees a clean state.
 */
export async function runDaemon({ dbPath, port, pidFile, uriFile }: DaemonOptions): Promise<void> {
    mkdirSync(dbPath, { recursive: true });
    mkdirSync(dirname(pidFile), { recursive: true });

    const { uri } = await startMongo({ dbPath, port });

    writeFileSync(pidFile, String(process.pid));
    writeFileSync(uriFile, uri);

    const cleanupMarkers = () => {
        try {
            rmSync(pidFile, { force: true });
        } catch {
            /* best effort */
        }
        try {
            rmSync(uriFile, { force: true });
        } catch {
            /* best effort */
        }
    };

    process.once('SIGTERM', cleanupMarkers);
    process.once('SIGINT', cleanupMarkers);
    process.once('beforeExit', cleanupMarkers);

    console.info(`[test-mongo] mongod ready at ${uri} (pid ${process.pid})`);
    await new Promise(() => {});
}
