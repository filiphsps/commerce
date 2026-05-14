import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parseShopifyWebhook as parseShopifyWebhookNew } from '@tagtree/shopify';
import { cache } from '@/cache';
import { validateShopifyHmac } from '@/utils/webhooks/shopify';

describe('utils/webhooks/shopify', () => {
    describe('validateShopifyHmac (deprecated)', () => {
        const secret = 'test-secret';
        const body = '{"id":1}';
        const validHmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

        it('returns true for a valid HMAC', () => {
            expect(validateShopifyHmac(body, validHmac, secret)).toBe(true);
        });

        it('returns false for an invalid HMAC', () => {
            expect(validateShopifyHmac(body, 'invalid', secret)).toBe(false);
        });

        it('returns false when the body has been tampered with', () => {
            expect(validateShopifyHmac('{"id":2}', validHmac, secret)).toBe(false);
        });

        it('returns false when a different (wrong) secret is used to compute the header HMAC', () => {
            const wrongSecret = 'wrong-secret';
            const hmacFromWrongSecret = createHmac('sha256', wrongSecret).update(body, 'utf8').digest('base64');
            // header carries HMAC from wrong-secret; we validate against the real secret — must fail
            expect(validateShopifyHmac(body, hmacFromWrongSecret, secret)).toBe(false);
        });
    });

    describe('parseShopifyWebhook (new @tagtree/shopify)', () => {
        const shop = { id: 'shop-1', domain: 'mock.shop' } as any;

        it('emits per-product tag for products/update', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'products/update', body: { handle: 'cool-shirt' } });
            expect(tags).toContain('shopify.shop-1.product.cool-shirt');
            // New behavior: includes parent tags and tenant extras (schema fanout)
            expect(tags).toContain('shopify.shop-1.products');
        });

        it('emits per-collection tag for collections/update', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'collections/update', body: { handle: 'summer' } });
            expect(tags).toContain('shopify.shop-1.collection.summer');
            expect(tags).toContain('shopify.shop-1.collections');
        });

        it('emits per-collection tag for collections/create', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'collections/create', body: { handle: 'winter' } });
            expect(tags).toContain('shopify.shop-1.collection.winter');
            expect(tags).toContain('shopify.shop-1.collections');
        });

        it('emits per-collection tag for collections/delete', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'collections/delete', body: { handle: 'old-sale' } });
            expect(tags).toContain('shopify.shop-1.collection.old-sale');
            expect(tags).toContain('shopify.shop-1.collections');
        });

        it('returns parent tags when collections/* handle is missing', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'collections/update', body: {} });
            // New behavior: returns parent entity tags (collections) even without handle
            expect(tags).toContain('shopify.shop-1.collections');
        });

        it('returns empty for inventory_levels/update', () => {
            const tags = parseShopifyWebhookNew({
                schema: cache,
                tenant: shop,
                topic: 'inventory_levels/update',
                body: { inventory_item_id: 1 },
            });
            // New behavior: unknown topics return empty array
            expect(tags).toEqual([]);
        });

        it('returns empty for inventory_levels/connect', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'inventory_levels/connect', body: {} });
            expect(tags).toEqual([]);
        });

        it('returns empty for unknown topics', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'orders/create', body: {} });
            expect(tags).toEqual([]);
        });

        it('emits per-product tag for products/create', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'products/create', body: { handle: 'new-shirt' } });
            expect(tags).toContain('shopify.shop-1.product.new-shirt');
            expect(tags).toContain('shopify.shop-1.products');
        });

        it('handles products/delete with handle from body', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'products/delete', body: { handle: 'old-product' } });
            expect(tags).toContain('shopify.shop-1.product.old-product');
        });

        it('returns parent tags when handle is missing', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'products/update', body: {} });
            // New behavior: returns parent entity tags (products) even without handle
            expect(tags).toContain('shopify.shop-1.products');
        });

        it('emits per-page tag for pages/update', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'pages/update', body: { handle: 'about' } });
            expect(tags).toContain('shopify.shop-1.page.about');
        });

        it('emits per-page tag for pages/create', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'pages/create', body: { handle: 'faq' } });
            expect(tags).toContain('shopify.shop-1.page.faq');
        });

        it('emits per-page tag for pages/delete', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'pages/delete', body: { handle: 'gone' } });
            expect(tags).toContain('shopify.shop-1.page.gone');
        });

        it('returns parent tags on pages/* when handle is missing', () => {
            const tags = parseShopifyWebhookNew({ schema: cache, tenant: shop, topic: 'pages/update', body: {} });
            // New behavior: returns parent entity tags (page) even without handle
            expect(tags).toContain('shopify.shop-1.page');
        });
    });
});
