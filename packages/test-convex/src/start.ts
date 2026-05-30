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
 * Starts a local Convex backend and returns its deployment URL, admin key, and
 * a `stop()` handle. Pass `dataDir` and `port` to make the instance persistent
 * across restarts; omit them for an ephemeral test backend.
 *
 * @param opts - Optional data-directory and port overrides. When `dataDir` is
 *   set, the directory is preserved on `stop()` so the next start reuses it.
 * @returns A {@link StartedConvex} with the deployment URL, admin key, and stop handle.
 * @throws Always until HARNESS-02 implements the backend lifecycle.
 */
export async function startConvex(opts: StartConvexOptions = {}): Promise<StartedConvex> {
    throw new Error(
        `@nordcom/commerce-test-convex: startConvex(${JSON.stringify(opts)}) is not implemented yet (HARNESS-02).`,
    );
}
