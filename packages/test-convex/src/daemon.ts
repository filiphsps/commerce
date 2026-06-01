import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import { startConvex } from './start';

/**
 * Configuration for the persistent `pnpm dev:convex` daemon process managed by {@link runDaemon}.
 *
 * @example
 * ```ts
 * await runDaemon({
 *     dataDir: resolve('.convex-dev'),
 *     port: 3210,
 *     pidFile: resolve('.convex-dev', '.pid'),
 *     urlFile: resolve('.convex-dev', '.url'),
 *     adminKeyFile: resolve('.convex-dev', '.admin-key'),
 * });
 * ```
 */
export interface DaemonOptions {
    /** Directory the backend persists its data to between restarts. */
    dataDir: string;
    /** Fixed port the deployment listens on. */
    port: number;
    /** Path the daemon writes its own PID to, for later `stop`. */
    pidFile: string;
    /** Path the daemon writes the deployment URL to, for client discovery. */
    urlFile: string;
    /** Path the daemon writes the admin key to, for privileged operations. */
    adminKeyFile: string;
}

/**
 * Long-running foreground process: spins up a Convex backend via
 * {@link startConvex}, writes PID, URL, and admin-key marker files, and idles
 * until SIGTERM/SIGINT. Intended for `pnpm dev:convex` and the detached spawner
 * behind `pnpm dev`; the storefront and e2e harness re-attach by reading the
 * URL marker.
 *
 * `startConvex` already installs orphan-proof signal handlers that stop the
 * backend; the additional handler here only removes the on-disk marker files so
 * the next dev run sees a clean state. Passing `dataDir` makes the backend
 * persistent, so its state directory survives a daemon restart for re-attach.
 *
 * @param opts - Data directory, port, and marker-file paths the daemon manages.
 * @returns Never resolves under normal operation; the process is terminated by a signal.
 * @throws {ConvexError} When the backend fails to boot (propagated from {@link startConvex}).
 */
export async function runDaemon({ dataDir, port, pidFile, urlFile, adminKeyFile }: DaemonOptions): Promise<void> {
    console.info(`[test-convex-daemon] starting (pid ${process.pid}) — dataDir=${dataDir} port=${port}`);
    mkdirSync(dataDir, { recursive: true });
    mkdirSync(dirname(pidFile), { recursive: true });

    const startedAt = Date.now();
    console.info('[test-convex-daemon] calling startConvex() — this may download the backend binary on first run');
    const { url, adminKey } = await startConvex({ dataDir, port });
    console.info(`[test-convex-daemon] startConvex() resolved in ${Date.now() - startedAt}ms — url=${url}`);

    writeFileSync(pidFile, String(process.pid));
    writeFileSync(urlFile, url);
    writeFileSync(adminKeyFile, adminKey);
    console.info(`[test-convex-daemon] wrote ${pidFile}, ${urlFile}, and ${adminKeyFile}`);

    const cleanupMarkers = (): void => {
        console.info('[test-convex-daemon] received shutdown signal — removing pid/url/admin-key markers');
        for (const file of [pidFile, urlFile, adminKeyFile]) {
            try {
                rmSync(file, { force: true });
            } catch {
                // Best-effort: a leftover marker is reconciled on the next start.
            }
        }
    };

    process.once('SIGTERM', cleanupMarkers);
    process.once('SIGINT', cleanupMarkers);
    process.once('beforeExit', cleanupMarkers);

    console.info(`[test-convex-daemon] backend ready at ${url} (pid ${process.pid}); idling until SIGTERM/SIGINT`);
    await new Promise(() => {});
}
