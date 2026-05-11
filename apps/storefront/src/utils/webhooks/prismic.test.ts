import { describe, expect, it } from 'vitest';
import { parsePrismicWebhook } from '@/utils/webhooks/prismic';

describe('utils/webhooks/prismic', () => {
    describe('parsePrismicWebhook', () => {
        const shop = { id: 'shop-1' };

        it('returns per-doc tags from documents array', () => {
            const tags = parsePrismicWebhook({
                shop,
                body: {
                    documents: [
                        { id: 'doc-a', uid: 'home', type: 'custom_page' },
                        { id: 'doc-b', uid: 'about', type: 'custom_page' },
                    ],
                },
            });
            expect(tags).toContain('prismic.shop-1.doc.custom_page.home');
            expect(tags).toContain('prismic.shop-1.doc.custom_page.about');
        });

        it('falls back to broad sweep when documents array is missing', () => {
            const tags = parsePrismicWebhook({ shop, body: {} });
            expect(tags).toEqual(['prismic.shop-1']);
        });

        it('uses id when uid is missing', () => {
            const tags = parsePrismicWebhook({
                shop,
                body: { documents: [{ id: 'doc-x', type: 'menu' }] },
            });
            expect(tags).toContain('prismic.shop-1.doc.menu.doc-x');
        });

        it('returns empty array for an empty documents array', () => {
            const tags = parsePrismicWebhook({ shop, body: { documents: [] } });
            expect(tags).toEqual([]);
        });

        it('handles multiple documents of different types', () => {
            const tags = parsePrismicWebhook({
                shop,
                body: {
                    documents: [
                        { id: 'doc-1', uid: 'home', type: 'custom_page' },
                        { id: 'doc-2', uid: 'primary', type: 'menu' },
                        { id: 'doc-3', type: 'footer' },
                    ],
                },
            });
            expect(tags).toHaveLength(3);
            expect(tags).toContain('prismic.shop-1.doc.custom_page.home');
            expect(tags).toContain('prismic.shop-1.doc.menu.primary');
            expect(tags).toContain('prismic.shop-1.doc.footer.doc-3');
        });

        it('falls back to broad sweep when documents is null (non-array)', () => {
            const tags = parsePrismicWebhook({ shop, body: { documents: null as any } });
            expect(tags).toEqual(['prismic.shop-1']);
        });

        it('tag format uses shopId from shop argument', () => {
            const otherShop = { id: 'other-shop-99' };
            const tags = parsePrismicWebhook({
                shop: otherShop,
                body: { documents: [{ id: 'doc-a', uid: 'slug', type: 'page' }] },
            });
            expect(tags).toContain('prismic.other-shop-99.doc.page.slug');
        });
    });
});
