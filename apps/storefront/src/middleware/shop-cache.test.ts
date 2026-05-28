import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    clearShopCache,
    createTtlCache,
    invalidateShop,
    NEGATIVE_TTL_MS,
    resolveShop,
    resolveShopLocales,
    SHOP_LOCALES_TTL_MS,
    SHOP_RESOLUTION_TTL_MS,
    type ShopResolution,
} from './shop-cache';

// The cache reads time via `Date.now()` only — no `setTimeout` — so fake timers
// give fully deterministic TTL behavior without depending on the wall clock.
beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

describe('createTtlCache', () => {
    it('loads once and serves the cached value on subsequent hits', async () => {
        const loader = vi.fn().mockResolvedValue('value');
        const cache = createTtlCache<string>({ positiveTtlMs: 1000, negativeTtlMs: 100, maxEntries: 10 });

        const first = await cache.get('key', loader);
        const second = await cache.get('key', loader);

        expect(first).toBe('value');
        expect(second).toBe('value');
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('loads independently for distinct keys', async () => {
        const loader = vi.fn((key: string) => Promise.resolve(`v:${key}`));
        const cache = createTtlCache<string>({ positiveTtlMs: 1000, negativeTtlMs: 100, maxEntries: 10 });

        await expect(cache.get('a', () => loader('a'))).resolves.toBe('v:a');
        await expect(cache.get('b', () => loader('b'))).resolves.toBe('v:b');

        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('reuses the in-flight load for concurrent callers (single-flight)', async () => {
        let resolveLoad!: (value: number) => void;
        const loader = vi.fn(() => new Promise<number>((resolve) => (resolveLoad = resolve)));
        const cache = createTtlCache<number>({ positiveTtlMs: 1000, negativeTtlMs: 100, maxEntries: 10 });

        const first = cache.get('key', loader);
        const second = cache.get('key', loader);

        // Both callers attached before the load settled, so only one ran.
        expect(loader).toHaveBeenCalledTimes(1);

        resolveLoad(42);
        await expect(first).resolves.toBe(42);
        await expect(second).resolves.toBe(42);
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('serves a fresh value within the positive TTL and reloads after it expires', async () => {
        const loader = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');
        const cache = createTtlCache<string>({ positiveTtlMs: 1000, negativeTtlMs: 100, maxEntries: 10 });

        await expect(cache.get('key', loader)).resolves.toBe('first');

        vi.advanceTimersByTime(999);
        await expect(cache.get('key', loader)).resolves.toBe('first');
        expect(loader).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(2);
        await expect(cache.get('key', loader)).resolves.toBe('second');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('replays a rejection within the negative TTL, then retries after it', async () => {
        const error = new Error('boom');
        const loader = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('recovered');
        const cache = createTtlCache<string>({ positiveTtlMs: 1000, negativeTtlMs: 500, maxEntries: 10 });

        await expect(cache.get('key', loader)).rejects.toBe(error);

        // Cached rejection: no second load while inside the negative window.
        vi.advanceTimersByTime(499);
        await expect(cache.get('key', loader)).rejects.toBe(error);
        expect(loader).toHaveBeenCalledTimes(1);

        // Past the negative window: retry succeeds.
        vi.advanceTimersByTime(2);
        await expect(cache.get('key', loader)).resolves.toBe('recovered');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('does not cache rejections when the negative TTL is zero', async () => {
        const error = new Error('boom');
        const loader = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('recovered');
        const cache = createTtlCache<string>({ positiveTtlMs: 1000, negativeTtlMs: 0, maxEntries: 10 });

        await expect(cache.get('key', loader)).rejects.toBe(error);
        // No negative caching: the very next call retries immediately.
        await expect(cache.get('key', loader)).resolves.toBe('recovered');
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('evicts the least-recently-used entry once over capacity', async () => {
        const loader = vi.fn((key: string) => Promise.resolve(`v:${key}`));
        const cache = createTtlCache<string>({ positiveTtlMs: 10_000, negativeTtlMs: 100, maxEntries: 2 });

        await cache.get('a', () => loader('a'));
        await cache.get('b', () => loader('b'));
        await cache.get('c', () => loader('c')); // evicts 'a'

        await cache.get('b', () => loader('b')); // still cached
        await cache.get('c', () => loader('c')); // still cached
        expect(loader).toHaveBeenCalledTimes(3);

        await cache.get('a', () => loader('a')); // evicted earlier → reload
        expect(loader).toHaveBeenCalledTimes(4);
    });

    it('treats a read as a recency touch so a touched key survives eviction', async () => {
        const loader = vi.fn((key: string) => Promise.resolve(`v:${key}`));
        const cache = createTtlCache<string>({ positiveTtlMs: 10_000, negativeTtlMs: 100, maxEntries: 2 });

        await cache.get('a', () => loader('a'));
        await cache.get('b', () => loader('b'));
        await cache.get('a', () => loader('a')); // touch 'a' → 'b' is now LRU
        await cache.get('c', () => loader('c')); // evicts 'b', keeps 'a'
        expect(loader).toHaveBeenCalledTimes(3);

        await cache.get('a', () => loader('a')); // still cached
        expect(loader).toHaveBeenCalledTimes(3);

        await cache.get('b', () => loader('b')); // evicted → reload
        expect(loader).toHaveBeenCalledTimes(4);
    });

    it('reloads after invalidate and clear', async () => {
        const loader = vi.fn().mockResolvedValue('value');
        const cache = createTtlCache<string>({ positiveTtlMs: 10_000, negativeTtlMs: 100, maxEntries: 10 });

        await cache.get('key', loader);
        cache.invalidate('key');
        await cache.get('key', loader);
        expect(loader).toHaveBeenCalledTimes(2);

        cache.clear();
        await cache.get('key', loader);
        expect(loader).toHaveBeenCalledTimes(3);
    });
});

describe('resolveShop / resolveShopLocales', () => {
    beforeEach(() => {
        clearShopCache();
    });

    const summary = (domain: string): ShopResolution => ({ domain, defaultLocale: 'en-US' });

    it('caches the resolution and serves hits without reloading', async () => {
        const loader = vi.fn().mockResolvedValue(summary('shop.com'));

        await expect(resolveShop('shop.com', loader)).resolves.toEqual(summary('shop.com'));
        await expect(resolveShop('shop.com', loader)).resolves.toEqual(summary('shop.com'));
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('expires a cached resolution after SHOP_RESOLUTION_TTL_MS', async () => {
        const loader = vi.fn().mockResolvedValue(summary('shop.com'));

        await resolveShop('shop.com', loader);

        vi.advanceTimersByTime(SHOP_RESOLUTION_TTL_MS - 1);
        await resolveShop('shop.com', loader);
        expect(loader).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(2);
        await resolveShop('shop.com', loader);
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('does not negatively cache an unknown host past NEGATIVE_TTL_MS', async () => {
        const loader = vi
            .fn<() => Promise<ShopResolution>>()
            .mockRejectedValueOnce(new Error('unknown shop'))
            .mockResolvedValue(summary('newly-added.com'));

        await expect(resolveShop('newly-added.com', loader)).rejects.toThrow('unknown shop');

        // Within the negative window the rejection is replayed (Mongo is spared).
        await expect(resolveShop('newly-added.com', loader)).rejects.toThrow('unknown shop');
        expect(loader).toHaveBeenCalledTimes(1);

        // A tenant added after the window resolves promptly — no redeploy needed.
        vi.advanceTimersByTime(NEGATIVE_TTL_MS + 1);
        await expect(resolveShop('newly-added.com', loader)).resolves.toEqual(summary('newly-added.com'));
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('resolves a newly added tenant immediately after invalidateShop', async () => {
        const loader = vi
            .fn<() => Promise<ShopResolution>>()
            .mockRejectedValueOnce(new Error('unknown shop'))
            .mockResolvedValue(summary('fresh-tenant.com'));

        await expect(resolveShop('fresh-tenant.com', loader)).rejects.toThrow('unknown shop');

        invalidateShop('fresh-tenant.com');

        // Invalidation bypasses the negative window entirely.
        await expect(resolveShop('fresh-tenant.com', loader)).resolves.toEqual(summary('fresh-tenant.com'));
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('serves cached locales without a second lookup', async () => {
        const loader = vi.fn().mockResolvedValue(['en-US', 'de-DE']);

        const first = await resolveShopLocales('shop.com', loader);
        const second = await resolveShopLocales('shop.com', loader);

        expect(first).toEqual(['en-US', 'de-DE']);
        expect(second).toBe(first);
        expect(loader).toHaveBeenCalledTimes(1);
    });

    it('keeps locales cached for longer than the resolution TTL', async () => {
        const loader = vi.fn().mockResolvedValue(['en-US']);

        await resolveShopLocales('shop.com', loader);

        // Past the (shorter) resolution TTL the locale list is still a hit.
        vi.advanceTimersByTime(SHOP_RESOLUTION_TTL_MS + 1);
        await resolveShopLocales('shop.com', loader);
        expect(loader).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(SHOP_LOCALES_TTL_MS);
        await resolveShopLocales('shop.com', loader);
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('clearShopCache drops both the resolution and locale caches', async () => {
        const resolutionLoader = vi.fn().mockResolvedValue(summary('shop.com'));
        const localesLoader = vi.fn().mockResolvedValue(['en-US']);

        await resolveShop('shop.com', resolutionLoader);
        await resolveShopLocales('shop.com', localesLoader);

        clearShopCache();

        await resolveShop('shop.com', resolutionLoader);
        await resolveShopLocales('shop.com', localesLoader);

        expect(resolutionLoader).toHaveBeenCalledTimes(2);
        expect(localesLoader).toHaveBeenCalledTimes(2);
    });
});
