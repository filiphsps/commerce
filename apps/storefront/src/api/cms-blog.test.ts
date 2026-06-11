import { afterEach, describe, expect, it } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockArticle, mockShop } from '@/utils/test/fixtures';
import { __setCmsReadQuery } from './_cms-read';
import { BlogApi } from './cms-blog';

/**
 * Installs a capturing read transport whose query resolves with the supplied value.
 *
 * @param value - The value every Convex query resolves with.
 * @returns The captured query invocations.
 */
function installQuery(value: unknown): { queries: Array<{ name: string; args: Record<string, unknown> }> } {
    const queries: Array<{ name: string; args: Record<string, unknown> }> = [];
    __setCmsReadQuery((name, args) => {
        queries.push({ name, args });
        return Promise.resolve(value);
    });
    return { queries };
}

afterEach(() => {
    __setCmsReadQuery(null);
});

describe('BlogApi — Convex-native (TEARDOWN-02 straight-line)', () => {
    it('serves the Convex listing, slices the requested window, and rebuilds the pagination envelope', async () => {
        const docs = Array.from({ length: 25 }, (...[, index]) =>
            mockArticle({ id: `a${index}`, slug: `post-${index}` }),
        );
        const { queries } = installQuery({ docs });

        const result = await BlogApi({
            shop: mockShop(),
            locale: Locale.from('en-US'),
            page: 2,
            limit: 10,
            tag: 'news',
        });

        // ONE full tag-filtered Convex read; the requested window is sliced client-side so the
        // getter serves the same page of docs the frozen envelope contract promises.
        expect(queries).toEqual([
            {
                name: 'cms/read:articles',
                args: { shopId: 'mock-shop-id', locale: 'en-US', tag: 'news' },
            },
        ]);
        expect(result.docs).toEqual(docs.slice(10, 20));
        expect(result).toMatchObject({
            totalDocs: 25,
            totalPages: 3,
            page: 2,
            hasNextPage: true,
            hasPrevPage: true,
            limit: 10,
            nextPage: 3,
            prevPage: 1,
        });
    });

    it('preserves the never-drop empty listing with a one-page envelope', async () => {
        installQuery({ docs: [] });
        const result = await BlogApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result.docs).toHaveLength(0);
        expect(result).toMatchObject({ totalDocs: 0, totalPages: 1, page: 1 });
    });
});
