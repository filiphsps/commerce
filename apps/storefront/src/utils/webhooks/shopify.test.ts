import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { parseShopifyWebhook, validateShopifyHmac } from '@/utils/webhooks/shopify';

describe('utils/webhooks/shopify', () => {
    describe('validateShopifyHmac', () => {
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
    });

    describe('parseShopifyWebhook', () => {
        const shop = { id: 'shop-1' };

        it('emits per-product tag for products/update', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'products/update', body: { handle: 'cool-shirt' } });
            expect(tags).toContain('shopify.shop-1.product.cool-shirt');
            expect(tags).toContain('shopify.shop-1');
        });

        it('emits per-collection tag for collections/update', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'collections/update', body: { handle: 'summer' } });
            expect(tags).toContain('shopify.shop-1.collection.summer');
            expect(tags).toContain('shopify.shop-1');
        });

        it('emits broad sweep for inventory_levels/update', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'inventory_levels/update', body: { inventory_item_id: 1 } });
            expect(tags).toEqual(['shopify.shop-1']);
        });

        it('emits broad sweep for unknown topics', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const tags = parseShopifyWebhook({ shop, topic: 'orders/create', body: {} });
            expect(tags).toEqual(['shopify.shop-1']);
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        it('handles products/delete with handle from body', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'products/delete', body: { handle: 'old-product' } });
            expect(tags).toContain('shopify.shop-1.product.old-product');
        });

        it('falls back to broad sweep when handle is missing', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'products/update', body: {} });
            expect(tags).toEqual(['shopify.shop-1']);
        });

        it('emits per-page tag for pages/update', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'pages/update', body: { handle: 'about' } });
            expect(tags).toContain('shopify.shop-1.page.about');
            expect(tags).toContain('shopify.shop-1');
        });

        it('emits per-page tag for pages/create', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'pages/create', body: { handle: 'faq' } });
            expect(tags).toContain('shopify.shop-1.page.faq');
            expect(tags).toContain('shopify.shop-1');
        });

        it('emits per-page tag for pages/delete', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'pages/delete', body: { handle: 'gone' } });
            expect(tags).toContain('shopify.shop-1.page.gone');
            expect(tags).toContain('shopify.shop-1');
        });

        it('falls back to broad sweep on pages/* when handle is missing', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'pages/update', body: {} });
            expect(tags).toEqual(['shopify.shop-1']);
        });
    });
});
