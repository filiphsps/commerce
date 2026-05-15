import { describe, expect, it, vi } from 'vitest';
import { createCacheInstance } from '../src/cache';
import { memoryAdapter } from '../src/memory-adapter';
import { defineCache } from '../src/schema';
import { str } from '../src/types';

type Shop = { id: string };

const buildCache = () => {
    const schema = defineCache({
        namespace: 'shopify',
        tenant: { type: {} as Shop, key: (s) => s.id },
        entities: { product: { params: { handle: str }, parents: ['products'] }, products: {} },
    });
    return createCacheInstance(schema, memoryAdapter({ maxEntries: 100 }));
};

describe('CacheInstance', () => {
    it('wrap returns the fetcher result on a cold cache and caches it', async () => {
        const cache = buildCache();
        const shop: Shop = { id: 'shop_1' };
        const fetcher = vi.fn().mockResolvedValue({ name: 'Cool Shirt' });

        const key = cache.keys.product({ tenant: shop, handle: 'cool-shirt' });
        const first = await cache.wrap(key, fetcher);
        const second = await cache.wrap(key, fetcher);

        expect(first).toEqual({ name: 'Cool Shirt' });
        expect(second).toEqual({ name: 'Cool Shirt' });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('wrap refetches after invalidateRaw clears a relevant tag', async () => {
        const cache = buildCache();
        const shop: Shop = { id: 'shop_1' };
        const fetcher = vi.fn().mockResolvedValueOnce({ name: 'v1' }).mockResolvedValueOnce({ name: 'v2' });

        const key = cache.keys.product({ tenant: shop, handle: 'cool-shirt' });
        const first = await cache.wrap(key, fetcher);
        await cache.invalidateRaw([key.tags[0]!]);
        const second = await cache.wrap(key, fetcher);

        expect(first).toEqual({ name: 'v1' });
        expect(second).toEqual({ name: 'v2' });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('read returns the cached value when present', async () => {
        const cache = buildCache();
        const shop: Shop = { id: 'shop_1' };
        const key = cache.keys.product({ tenant: shop, handle: 'cool-shirt' });
        await cache.wrap(key, async () => ({ name: 'X' }));

        const result = await cache.read(key);
        expect(result).toEqual({ name: 'X' });
    });

    it('read returns undefined when absent', async () => {
        const cache = buildCache();
        const shop: Shop = { id: 'shop_1' };
        const key = cache.keys.product({ tenant: shop, handle: 'never-cached' });
        expect(await cache.read(key)).toBeUndefined();
    });

    it('write stores a value without invoking a fetcher', async () => {
        const cache = buildCache();
        const shop: Shop = { id: 'shop_1' };
        const key = cache.keys.product({ tenant: shop, handle: 'cool-shirt' });
        await cache.write(key, { name: 'written' });
        expect(await cache.read(key)).toEqual({ name: 'written' });
    });

    it('invalidateRaw fires the adapter with the given tags', async () => {
        const cache = buildCache();
        const shop: Shop = { id: 'shop_1' };
        const k1 = cache.keys.product({ tenant: shop, handle: 'a' });
        const k2 = cache.keys.product({ tenant: shop, handle: 'b' });
        await cache.wrap(k1, async () => 1);
        await cache.wrap(k2, async () => 2);

        await cache.invalidateRaw(['shopify.shop_1.products']);

        expect(await cache.read(k1)).toBeUndefined();
        expect(await cache.read(k2)).toBeUndefined();
    });
});
