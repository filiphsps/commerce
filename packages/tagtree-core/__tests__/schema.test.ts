import { describe, expect, it } from 'vitest';
import { defineCache } from '../src/schema';
import { str } from '../src/types';

describe('defineCache', () => {
    it('captures the namespace', () => {
        const cache = defineCache({
            namespace: 'shopify',
            entities: { product: { params: { handle: str } } },
        });
        expect(cache.schema.namespace).toBe('shopify');
    });

    it('stores entity declarations', () => {
        const cache = defineCache({
            namespace: 'shopify',
            entities: {
                product: { params: { handle: str }, parents: ['products'] },
                products: {},
            },
        });
        expect(Object.keys(cache.schema.entities)).toEqual(['product', 'products']);
        expect(cache.schema.entities.product.parents).toEqual(['products']);
    });

    it('stores an optional tenant config', () => {
        type Shop = { id: string; domain: string };
        const cache = defineCache({
            namespace: 'shopify',
            tenant: {
                type: {} as Shop,
                key: (s) => s.id,
                extraTags: (s) => [s.domain],
            },
            entities: { products: {} },
        });
        const shop: Shop = { id: 'shop_1', domain: 'example.com' };
        expect(cache.schema.tenant?.key(shop)).toBe('shop_1');
        expect(cache.schema.tenant?.extraTags?.(shop)).toEqual(['example.com']);
    });

    it('stores an optional qualifier config', () => {
        type Locale = { code: string };
        const cache = defineCache({
            namespace: 'shopify',
            qualifier: { type: {} as Locale, key: (l) => l.code },
            entities: { products: {} },
        });
        expect(cache.schema.qualifier?.key({ code: 'en-US' })).toBe('en-US');
    });

    it('rejects a namespace containing the segment separator', () => {
        expect(() =>
            defineCache({
                namespace: 'shop.ify',
                entities: { products: {} },
            }),
        ).toThrow(/namespace.*"\."/);
    });

    it('rejects an entity name containing the segment separator', () => {
        expect(() =>
            defineCache({
                namespace: 'shopify',
                entities: { 'pro.duct': {} },
            }),
        ).toThrow(/entity.*"\."/);
    });
});
