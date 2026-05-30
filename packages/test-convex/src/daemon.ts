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
 * Long-running foreground process: spins up a Convex backend via `startConvex`,
 * writes PID, URL, and admin-key marker files, and idles until SIGTERM/SIGINT.
 * Intended for `pnpm dev:convex` and the detached spawner behind `pnpm dev`.
 *
 * @param opts - Data directory, port, and marker-file paths the daemon manages.
 * @returns Never resolves under normal operation; the process is terminated by a signal.
 * @throws Always until HARNESS-02 implements the daemon lifecycle.
 */
export async function runDaemon(opts: DaemonOptions): Promise<void> {
    throw new Error(
        `@nordcom/commerce-test-convex: runDaemon(${JSON.stringify(opts)}) is not implemented yet (HARNESS-02).`,
    );
}
