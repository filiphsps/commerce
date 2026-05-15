import { describe, expect, it, vi } from 'vitest';
import { createCacheInstance } from '../src/cache';
import { memoryAdapter } from '../src/memory-adapter';
import { defineCache } from '../src/schema';
import { str } from '../src/types';

type Shop = { id: string; domain: string };

const buildCache = () => {
    const schema = defineCache({
        namespace: 'shopify',
        tenant: {
            type: {} as Shop,
            key: (s) => s.id,
            extraTags: (s) => [s.domain],
        },
        entities: {
            product: { params: { handle: str }, parents: ['products'] },
            products: {},
        },
    });
    return createCacheInstance(schema, memoryAdapter({ maxEntries: 100 }));
};

describe('cache.invalidate.<entity>', () => {
    it('fires the full fanout for one entity', async () => {
        const cache = buildCache();
        const shop: Shop = { id: 'shop_1', domain: 'example.com' };
        const adapterSpy = vi.spyOn(cache, 'invalidateRaw');

        await cache.invalidate.product({ tenant: shop, handle: 'cool-shirt' });

        expect(adapterSpy).toHaveBeenCalledWith([
            'shopify.shop_1.product.cool-shirt',
            'shopify.shop_1.product',
            'shopify.shop_1.products',
            'shopify.shop_1.example%2Ecom',
            'shopify.shop_1',
            'shopify',
        ]);
    });

    it('coarse invalidation (entity without params) omits the leaf', async () => {
        const cache = buildCache();
        const shop: Shop = { id: 'shop_1', domain: 'example.com' };
        const adapterSpy = vi.spyOn(cache, 'invalidateRaw');

        await cache.invalidate.products({ tenant: shop });

        expect(adapterSpy).toHaveBeenCalledWith([
            'shopify.shop_1.products',
            'shopify.shop_1.example%2Ecom',
            'shopify.shop_1',
            'shopify',
        ]);
    });

    it('cache.invalidate.tenant fires every tag rooted at the tenant', async () => {
        const cache = buildCache();
        const shop: Shop = { id: 'shop_1', domain: 'example.com' };
        const adapterSpy = vi.spyOn(cache, 'invalidateRaw');

        await cache.invalidate.tenant(shop);

        expect(adapterSpy).toHaveBeenCalledWith(['shopify.shop_1.example%2Ecom', 'shopify.shop_1', 'shopify']);
    });

    it('cache.invalidate.all fires the namespace root', async () => {
        const cache = buildCache();
        const adapterSpy = vi.spyOn(cache, 'invalidateRaw');
        await cache.invalidate.all();
        expect(adapterSpy).toHaveBeenCalledWith(['shopify']);
    });
});
