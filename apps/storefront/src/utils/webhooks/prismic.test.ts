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
    });
});
