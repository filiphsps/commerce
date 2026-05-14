import { describe, expect, it } from 'vitest';
import { buildKeyFactory, type CacheKey } from '../src/keys';
import { defineCache } from '../src/schema';
import { str } from '../src/types';

type Shop = { id: string; domain: string };
type Locale = { code: string };

describe('cache.keys.<entity>', () => {
    const cache = defineCache({
        namespace: 'shopify',
        tenant: {
            type: {} as Shop,
            key: (s) => s.id,
            extraTags: (s) => [s.domain],
        },
        qualifier: { type: {} as Locale, key: (l) => l.code },
        entities: {
            product: { params: { handle: str }, parents: ['products'] },
            products: {},
        },
    });
    const shop: Shop = { id: 'shop_1', domain: 'example.com' };
    const locale: Locale = { code: 'en-US' };

    it('builds primary, tags, readTag for an entity with params + qualifier', () => {
        const keys = buildKeyFactory(cache.schema);
        const key: CacheKey = keys.product({ tenant: shop, qualifier: locale, handle: 'cool-shirt' });

        expect(key.primary).toBe('shopify.shop_1.product.cool-shirt');
        expect(key.readTag).toBe('shopify.shop_1.product.cool-shirt::en-US');
        expect(key.tags).toEqual([
            'shopify.shop_1.product.cool-shirt',
            'shopify.shop_1.product',
            'shopify.shop_1.products',
            'shopify.shop_1.example%2Ecom',
            'shopify.shop_1',
            'shopify',
        ]);
    });

    it('omits the qualifier from readTag when no qualifier is supplied', () => {
        const keys = buildKeyFactory(cache.schema);
        const key = keys.product({ tenant: shop, handle: 'x' });
        expect(key.readTag).toBe('shopify.shop_1.product.x');
    });

    it('exposes every declared entity as a builder', () => {
        const keys = buildKeyFactory(cache.schema);
        expect(typeof keys.product).toBe('function');
        expect(typeof keys.products).toBe('function');
    });

    it('returns undefined for an entity not declared in the schema', () => {
        const keys = buildKeyFactory(cache.schema) as Record<string, unknown>;
        expect(keys.banana).toBeUndefined();
    });
});
