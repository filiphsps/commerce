import { afterEach, describe, expect, it } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockCmsPage, mockShop } from '@/utils/test/fixtures';
import { __setCmsReadQuery } from './_cms-read';
import { PagesApi } from './page';

/**
 * Installs a capturing read transport whose query resolves with the supplied value.
 *
 * @param value - The value every Convex query resolves with.
 * @returns The captured query names.
 */
function installQuery(value: unknown): { queries: string[] } {
    const queries: string[] = [];
    __setCmsReadQuery((name) => {
        queries.push(name);
        return Promise.resolve(value);
    });
    return { queries };
}

afterEach(() => {
    __setCmsReadQuery(null);
});

describe('PagesApi — Convex-native (TEARDOWN-02 straight-line)', () => {
    it('serves the Convex listing and rebuilds the frozen single-window envelope around the docs untouched', async () => {
        const docs = [mockCmsPage({ id: 'p1', slug: 'about' }), mockCmsPage({ id: 'p2', slug: 'home' })];
        const { queries } = installQuery({ docs });

        const result = await PagesApi({ shop: mockShop(), locale: Locale.from('en-US') });

        // The docs pass through byte-identical; only the pagination bookkeeping is synthesized.
        expect(result.docs).toBe(docs);
        expect(result).toMatchObject({
            totalDocs: 2,
            totalPages: 1,
            page: 1,
            hasNextPage: false,
            hasPrevPage: false,
            limit: 1000,
        });
        expect(queries).toEqual(['cms/read:pages']);
    });

    it('preserves the never-drop empty listing', async () => {
        installQuery({ docs: [] });
        const result = await PagesApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result.docs).toHaveLength(0);
    });

    it('costs exactly ONE bounded Convex read for a 1000-page window — the sitemap/warmer build budget', async () => {
        const docs = Array.from({ length: 1000 }, (...[, index]) =>
            mockCmsPage({ id: `p${index}`, slug: `page-${index}` }),
        );
        const { queries } = installQuery({ docs });

        const result = await PagesApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result.docs).toHaveLength(1000);
        expect(queries).toEqual(['cms/read:pages']);
    });
});
