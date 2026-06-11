import { afterEach, describe, expect, it } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockArticle, mockShop } from '@/utils/test/fixtures';
import { __setCmsReadQuery } from './_cms-read';
import { ArticleApi } from './article';

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

describe('ArticleApi — Convex-native (TEARDOWN-02 straight-line)', () => {
    it('serves the Convex slug read untouched (SFREAD-01 byte-identity)', async () => {
        const article = mockArticle({ slug: 'launch-news' });
        const { queries } = installQuery(article);

        const result = await ArticleApi({ shop: mockShop(), locale: Locale.from('en-US'), slug: 'launch-news' });

        // Identity passthrough: the getter applies no reshaping, so the contract-shaped
        // document the Convex read serves IS the getter result.
        expect(result).toBe(article);
        expect(queries).toEqual([
            {
                name: 'cms/read:articleBySlug',
                args: { shopId: 'mock-shop-id', slug: 'launch-news', locale: 'en-US' },
            },
        ]);
    });

    it('serves the native ProseMirror body untouched — the exact document the RichText renderer consumes', async () => {
        // The CUTOVER-05 rich-text contract: article bodies are ProseMirror JSON
        // (the ETL/native-editor shape), the input `blocks/rich-text-renderer` renders 1:1 —
        // its golden-parity suite pins the DOM for this document class.
        const body = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'EN body' }] }],
        };
        installQuery(mockArticle({ slug: 'launch-news', body: body as never }));

        const result = await ArticleApi({ shop: mockShop(), locale: Locale.from('en-US'), slug: 'launch-news' });
        expect(result?.body).toBe(body);
    });

    it('preserves null-on-missing from the Convex read (overlay-only design)', async () => {
        installQuery(null);
        const result = await ArticleApi({ shop: mockShop(), locale: Locale.from('en-US'), slug: 'absent' });
        expect(result).toBeNull();
    });
});
