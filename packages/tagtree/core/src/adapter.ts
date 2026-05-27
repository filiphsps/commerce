import type { CacheSchemaShape, EntitiesMap } from './schema';

/**
 * Minimal structured-log interface that cache adapters and the instance internals use to report
 * events without pulling in a concrete logging dependency.
 *
 * @example
 * ```ts
 * const myLogger: ILogger = {
 *     debug: (msg) => process.stdout.write(`[debug] ${msg}\n`),
 *     info:  (msg) => process.stdout.write(`[info]  ${msg}\n`),
 *     warn:  (msg) => process.stderr.write(`[warn]  ${msg}\n`),
 *     error: (msg) => process.stderr.write(`[error] ${msg}\n`),
 * };
 * const cache = createCacheInstance(mySchema, myAdapter, { logger: myLogger });
 * ```
 */
export interface ILogger {
    debug: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
    error: (msg: string, meta?: Record<string, unknown>) => void;
}

/**
 * Runtime context passed to every adapter operation, carrying the schema definition and a logger
 * so adapters can emit structured diagnostics tied to the call site.
 *
 * @example
 * ```ts
 * const ctx: AdapterCtx = {
 *     schema: myCache.schema,
 *     logger: consoleLogger,
 * };
 * await myAdapter.read('some-key', ctx);
 * ```
 */
export interface AdapterCtx<S extends CacheSchemaShape = CacheSchemaShape<string, unknown, unknown, EntitiesMap>> {
    /** The resolved cache schema shape; adapters may inspect `schema.namespace` for scoped logging. */
    schema: S;
    /** Logger instance for emitting diagnostics from within adapter operations. */
    logger: ILogger;
    /** Opaque per-request value that adapter implementations may use to correlate operations across a single request lifecycle. */
    requestScope?: unknown;
}

/**
 * Options that govern how a cache entry is stored; controls TTL expiry, stale-while-revalidate
 * behavior, and a staleness-guard timestamp that prevents a racing webhook from being overwritten
 * by a fetch that started before the invalidation arrived.
 *
 * @example
 * ```ts
 * await instance.write(key, data, { ttl: 300, swr: true });
 * ```
 */
export interface WriteOpts {
    /** Entry lifetime in seconds; omit for indefinite storage. */
    ttl?: number;
    /** When `true`, the adapter may return a stale entry and revalidate in the background. */
    swr?: boolean;
    // Drop the write if the tag index records an invalidation newer than this timestamp.
    // wrap() records a "fetch started at" timestamp before invoking the fetcher and
    // passes it here, so a webhook that fires invalidation while the fetcher is in
    // flight wins the race.
    /** Reject the write if any of the entry's tags were invalidated after this epoch timestamp. */
    writeIfNewerThan?: number;
}

/**
 * Contract that every cache backend must implement to integrate with tagtree's tag-aware
 * invalidation model. Adapters are responsible for storage, tag-index maintenance, and
 * optional features like response decoration or native wrap delegation.
 *
 * @example
 * ```ts
 * const adapter: CacheAdapter = memoryAdapter({ maxEntries: 500 });
 * const cache = createCacheInstance(mySchema, adapter);
 * ```
 */
export interface CacheAdapter {
    read(key: string, ctx: AdapterCtx): Promise<{ value: unknown; tags: string[] } | undefined>;
    write(key: string, value: unknown, tags: string[], opts: WriteOpts, ctx: AdapterCtx): Promise<void>;
    invalidate(tags: string[], ctx: AdapterCtx): Promise<void>;
    // When present, CacheInstance.wrap delegates the entire wrap-with-fetcher operation.
    // Used by adapters that ship their own caching primitive (e.g., Next's unstable_cache).
    wrap?<R>(key: string, fetcher: () => Promise<R>, tags: string[], opts: WriteOpts, ctx: AdapterCtx): Promise<R>;
    decorateResponse?(response: Response, tags: string[]): Response;
    init?(): Promise<void>;
}

/**
 * Ready-made `ILogger` implementation that prefixes all messages with `[tagtree]` and forwards to
 * the native `console` methods; suitable for development and low-volume production use.
 *
 * @example
 * ```ts
 * const cache = createCacheInstance(mySchema, myAdapter, { logger: consoleLogger });
 * ```
 */
export const consoleLogger: ILogger = {
    debug: (msg, meta) => console.debug(`[tagtree] ${msg}`, meta ?? ''),
    info: (msg, meta) => console.info(`[tagtree] ${msg}`, meta ?? ''),
    warn: (msg, meta) => console.warn(`[tagtree] ${msg}`, meta ?? ''),
    error: (msg, meta) => console.error(`[tagtree] ${msg}`, meta ?? ''),
};
