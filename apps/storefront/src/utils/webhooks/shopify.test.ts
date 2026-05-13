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

        it('returns false when a different (wrong) secret is used to compute the header HMAC', () => {
            const wrongSecret = 'wrong-secret';
            const hmacFromWrongSecret = createHmac('sha256', wrongSecret).update(body, 'utf8').digest('base64');
            // header carries HMAC from wrong-secret; we validate against the real secret — must fail
            expect(validateShopifyHmac(body, hmacFromWrongSecret, secret)).toBe(false);
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

        it('emits per-collection tag for collections/create', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'collections/create', body: { handle: 'winter' } });
            expect(tags).toContain('shopify.shop-1.collection.winter');
            expect(tags).toContain('shopify.shop-1');
        });

        it('emits per-collection tag for collections/delete', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'collections/delete', body: { handle: 'old-sale' } });
            expect(tags).toContain('shopify.shop-1.collection.old-sale');
            expect(tags).toContain('shopify.shop-1');
        });

        it('falls back to list + broad sweep when collections/* handle is missing', () => {
            // Webhook now also emits the plural `.collections` tag so list
            // pages (e.g. `/collections`) refresh on any collection change,
            // not just the per-entity tag.
            const tags = parseShopifyWebhook({ shop, topic: 'collections/update', body: {} });
            expect(tags).toEqual(['shopify.shop-1.collections', 'shopify.shop-1']);
        });

        it('emits per-collection + list-level tags for collections/update with handle', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'collections/update', body: { handle: 'summer' } });
            expect(tags).toContain('shopify.shop-1.collection.summer');
            expect(tags).toContain('shopify.shop-1.collections');
            expect(tags).toContain('shopify.shop-1');
        });

        it('emits broad sweep for inventory_levels/update', () => {
            const tags = parseShopifyWebhook({
                shop,
                topic: 'inventory_levels/update',
                body: { inventory_item_id: 1 },
            });
            expect(tags).toEqual(['shopify.shop-1']);
        });

        it('emits broad sweep for inventory_levels/connect without console.warn', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const tags = parseShopifyWebhook({ shop, topic: 'inventory_levels/connect', body: {} });
            expect(tags).toEqual(['shopify.shop-1']);
            // inventory_levels/* topics are known — no warn should fire
            expect(warnSpy).not.toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        it('emits broad sweep for unknown topics', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const tags = parseShopifyWebhook({ shop, topic: 'orders/create', body: {} });
            expect(tags).toEqual(['shopify.shop-1']);
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
        });

        it('emits per-product tag for products/create', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'products/create', body: { handle: 'new-shirt' } });
            expect(tags).toContain('shopify.shop-1.product.new-shirt');
            expect(tags).toContain('shopify.shop-1');
        });

        it('handles products/delete with handle from body', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'products/delete', body: { handle: 'old-product' } });
            expect(tags).toContain('shopify.shop-1.product.old-product');
        });

        it('falls back to list + broad sweep when handle is missing', () => {
            // Webhook now also emits the plural `.products` tag so list pages
            // (e.g. `/products`) refresh on any product change, not just the
            // per-entity tag.
            const tags = parseShopifyWebhook({ shop, topic: 'products/update', body: {} });
            expect(tags).toEqual(['shopify.shop-1.products', 'shopify.shop-1']);
        });

        it('emits per-product + list-level tags for products/update with handle', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'products/update', body: { handle: 'cool-shirt' } });
            expect(tags).toContain('shopify.shop-1.product.cool-shirt');
            expect(tags).toContain('shopify.shop-1.products');
            expect(tags).toContain('shopify.shop-1');
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

        it('rejects malformed handles instead of interpolating them into tag strings', () => {
            // Handle is HMAC-signed by Shopify, but a crafted handle (regex
            // metachars, spaces, ../, leading dashes) could collide with
            // unrelated tag namespaces. Strict kebab-case only — anything
            // else falls back to broad sweep.
            for (const bad of ['', '../etc', 'with space', 'CAPS', 'a/b', '..', '-leading', 'trailing-']) {
                const tags = parseShopifyWebhook({ shop, topic: 'products/update', body: { handle: bad } });
                expect(tags).toEqual(['shopify.shop-1.products', 'shopify.shop-1']);
            }
        });

        it('accepts well-formed kebab-case handles', () => {
            const tags = parseShopifyWebhook({ shop, topic: 'products/update', body: { handle: 'a1-b2-c3' } });
            expect(tags).toContain('shopify.shop-1.product.a1-b2-c3');
        });
    });
});
