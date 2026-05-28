/**
 * Process-level tenant-resolution cache for the storefront edge middleware.
 *
 * The middleware resolves `hostname → shop` on the critical path of every
 * matched request. Without memoization that means a MongoDB lookup per request
 * (plus, for cookie-less requests, a Shopify Storefront GraphQL round-trip to
 * derive the supported locales) — all on the edge. `React.cache()` cannot help
 * here because middleware does not run inside the RSC render, so this module
 * provides a plain in-process TTL + LRU cache instead.
 *
 * Two concerns are cached independently, keyed by request hostname:
 *   - the cheap existence + default-locale summary (`ShopResolution`), and
 *   - the expensive supported-locale list (`string[]`, one Shopify round-trip).
 * They are split because the common validation lookup only needs the summary,
 * so it must not pay for the locale round-trip.
 *
 * Tenant safety (CLAUDE.md "new tenant = row, no redeploy"): unknown hosts are
 * never cached longer than {@link NEGATIVE_TTL_MS} (a few seconds) so a newly
 * added tenant resolves promptly without a redeploy. Positive entries live for
 * a short, bounded TTL; cross-process staleness (e.g. an admin edits a shop in
 * another process) is therefore bounded by that TTL. {@link invalidateShop} and
 * {@link clearShopCache} expose explicit in-process invalidation for callers
 * that mutate shops within the storefront process.
 */

/**
 * Tunable lifetimes for a {@link createTtlCache} instance. All values are in
 * milliseconds; `negativeTtlMs` of `0` disables negative caching entirely.
 */
export type TtlCacheConfig = {
    /** How long a resolved value is served before it is reloaded. */
    positiveTtlMs: number;
    /**
     * How long a rejected load is replayed before it is retried. Bound this to
     * a few seconds so transient failures (and unknown hosts) recover quickly.
     */
    negativeTtlMs: number;
    /** Hard upper bound on retained entries; least-recently-used keys evict first. */
    maxEntries: number;
};

/**
 * Minimal cache surface returned by {@link createTtlCache}: a single-flight
 * loader-backed `get`, plus explicit invalidation.
 */
export type TtlCache<T> = {
    /**
     * Returns the cached value for `key`, invoking `loader` once on a miss or
     * after expiry. Concurrent calls for the same key share a single in-flight
     * load (no thundering herd). Rejections propagate and are briefly cached per
     * {@link TtlCacheConfig.negativeTtlMs}.
     */
    get(key: string, loader: () => Promise<T> | T): Promise<T>;
    /** Drops the entry for `key`, forcing the next `get` to reload. */
    invalidate(key: string): void;
    /** Drops every entry. */
    clear(): void;
};

/**
 * Resolved tenant summary cached per request hostname. Holds only what the
 * middleware needs for validation and locale defaulting — never credentials.
 */
export type ShopResolution = {
    /** Canonical shop domain (may differ from the request hostname for alternative domains). */
    domain: string;
    /** The shop's configured default locale, e.g. `en-US`. */
    defaultLocale: string;
};

/** Bounded positive TTL for the hostname → existence/default-locale summary. */
export const SHOP_RESOLUTION_TTL_MS = 60_000;

/**
 * Bounded positive TTL for the hostname → supported-locale list. Longer than
 * the resolution TTL because the locale set changes rarely and the underlying
 * Shopify round-trip is the expensive part to avoid repeating.
 */
export const SHOP_LOCALES_TTL_MS = 300_000;

/**
 * Upper bound on how long a failed lookup (including an unknown host) is
 * replayed before retrying. Capped to a few seconds so a freshly added tenant
 * resolves without waiting out a long positive TTL.
 */
export const NEGATIVE_TTL_MS = 2_500;

/** Per-cache entry ceiling; protects the edge process from unbounded growth. */
export const MAX_ENTRIES = 1_000;

/**
 * A cached load. Pending entries are always replayed (single-flight); once
 * `settled`, `expiresAt` gates reuse.
 */
type CacheEntry<T> = {
    /** The in-flight or settled load. Rejections re-throw the original error. */
    promise: Promise<T>;
    /** Epoch-ms after which a settled entry is stale. Ignored while pending. */
    expiresAt: number;
    /** Whether the underlying load has settled (resolved or rejected). */
    settled: boolean;
};

/**
 * Builds a single-flight TTL + LRU cache. Values live for `positiveTtlMs`;
 * failures are replayed for at most `negativeTtlMs` (or not cached when that is
 * `0`); the map is capped at `maxEntries` with least-recently-used eviction.
 *
 * @param config - Lifetime and capacity bounds for the cache instance.
 * @returns A {@link TtlCache} bound to a private backing `Map`.
 */
export function createTtlCache<T>({ positiveTtlMs, negativeTtlMs, maxEntries }: TtlCacheConfig): TtlCache<T> {
    // Map iteration order is insertion order, so the first key is the
    // least-recently-used after every read re-inserts the touched entry.
    const store = new Map<string, CacheEntry<T>>();

    /**
     * Moves an entry to the most-recently-used position.
     *
     * @param key - The entry's key.
     * @param entry - The entry to re-insert at the tail.
     */
    const touch = (key: string, entry: CacheEntry<T>): void => {
        store.delete(key);
        store.set(key, entry);
    };

    /** Evicts least-recently-used entries until the map is within `maxEntries`. */
    const evict = (): void => {
        while (store.size > maxEntries) {
            const oldest = store.keys().next().value;
            if (oldest === undefined) break;
            store.delete(oldest);
        }
    };

    return {
        get(key, loader) {
            const now = Date.now();
            const existing = store.get(key);
            // Reuse while pending (single-flight) or while a settled value is fresh.
            if (existing && (!existing.settled || existing.expiresAt > now)) {
                touch(key, existing);
                return existing.promise;
            }

            const entry: CacheEntry<T> = {
                promise: Promise.resolve() as Promise<T>,
                expiresAt: now + positiveTtlMs,
                settled: false,
            };

            // `(async () => loader())()` normalizes a sync-throwing loader into a
            // rejected promise so a thrown loader cannot leave a half-built entry.
            entry.promise = (async () => loader())().then(
                (value) => {
                    entry.settled = true;
                    entry.expiresAt = Date.now() + positiveTtlMs;
                    return value;
                },
                (error: unknown) => {
                    entry.settled = true;
                    if (negativeTtlMs > 0) {
                        entry.expiresAt = Date.now() + negativeTtlMs;
                    } else if (store.get(key) === entry) {
                        // Negative caching disabled: drop so the next call retries,
                        // but only if a newer load hasn't already replaced us.
                        store.delete(key);
                    }
                    throw error;
                },
            );

            // Re-insert at the tail so a refreshed key counts as most-recently-used.
            store.delete(key);
            store.set(key, entry);
            evict();
            return entry.promise;
        },
        invalidate(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
    };
}

const resolutionCache = createTtlCache<ShopResolution>({
    positiveTtlMs: SHOP_RESOLUTION_TTL_MS,
    negativeTtlMs: NEGATIVE_TTL_MS,
    maxEntries: MAX_ENTRIES,
});

const localesCache = createTtlCache<string[]>({
    positiveTtlMs: SHOP_LOCALES_TTL_MS,
    negativeTtlMs: NEGATIVE_TTL_MS,
    maxEntries: MAX_ENTRIES,
});

/**
 * Resolves (and caches) the existence + default-locale summary for a hostname.
 * On a cache miss `loader` runs; an unknown host should reject from `loader` so
 * it is only briefly negatively cached (see {@link NEGATIVE_TTL_MS}).
 *
 * @param hostname - The request hostname to resolve.
 * @param loader - Performs the lean, credential-free lookup on a miss.
 * @returns The cached or freshly loaded {@link ShopResolution}.
 * @throws Whatever `loader` rejects with (e.g. an unknown-shop error).
 */
export function resolveShop(hostname: string, loader: () => Promise<ShopResolution>): Promise<ShopResolution> {
    return resolutionCache.get(hostname, loader);
}

/**
 * Resolves (and caches) the supported locale codes for a hostname. On a miss
 * `loader` performs the Shopify round-trip; a cache hit needs no client or
 * credentials, so cookie-less requests for a known shop avoid the round-trip.
 *
 * @param hostname - The request hostname whose locales are needed.
 * @param loader - Performs the Shopify locale lookup on a miss.
 * @returns The cached or freshly loaded list of locale codes.
 * @throws Whatever `loader` rejects with (e.g. a provider fetch error).
 */
export function resolveShopLocales(hostname: string, loader: () => Promise<string[]>): Promise<string[]> {
    return localesCache.get(hostname, loader);
}

/**
 * Drops every cached entry for a hostname (both summary and locales). Use on
 * in-process shop writes so the next request reloads instead of serving a stale
 * value through the positive TTL window.
 *
 * @param hostname - The request hostname to invalidate.
 */
export function invalidateShop(hostname: string): void {
    resolutionCache.invalidate(hostname);
    localesCache.invalidate(hostname);
}

/** Clears the entire shop cache (both summary and locales). */
export function clearShopCache(): void {
    resolutionCache.clear();
    localesCache.clear();
}
