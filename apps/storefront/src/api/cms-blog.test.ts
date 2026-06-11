import { getArticles } from '@nordcom/commerce-cms/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockArticle, mockShop } from '@/utils/test/fixtures';
import { __setCmsShadowTransport, type CmsShadowTransport, flushCmsShadows } from './_cms-shadow';
import { BlogApi } from './cms-blog';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getArticles: vi.fn() };
});

/**
 * Installs a capturing shadow transport whose query resolves with the supplied value.
 *
 * @param value - The value every Convex query resolves with.
 * @returns The captured query invocations.
 */
function installTransport(value: unknown): { queries: Array<{ name: string; args: Record<string, unknown> }> } {
    const queries: Array<{ name: string; args: Record<string, unknown> }> = [];
    const transport: CmsShadowTransport = {
        query: (name, args) => {
            queries.push({ name, args });
            return Promise.resolve(value);
        },
        mutation: () => Promise.resolve(null),
    };
    __setCmsShadowTransport(transport);
    return { queries };
}

afterEach(async () => {
    await flushCmsShadows();
    __setCmsShadowTransport(null);
    delete process.env.CMS_READ_FLIP;
    vi.mocked(getArticles).mockReset();
});

describe('BlogApi — Convex-native default (CUTOVER-05)', () => {
    it('serves the Convex listing, slices the requested window, and rebuilds the pagination envelope', async () => {
        const docs = Array.from({ length: 25 }, (...[, index]) =>
            mockArticle({ id: `a${index}`, slug: `post-${index}` }),
        );
        const { queries } = installTransport({ docs });

        const result = await BlogApi({
            shop: mockShop(),
            locale: Locale.from('en-US'),
            page: 2,
            limit: 10,
            tag: 'news',
        });

        // ONE full tag-filtered Convex read; the requested window is sliced client-side so the
        // flipped getter serves the same page of docs the Mongo envelope would.
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
        expect(getArticles).not.toHaveBeenCalled();
    });

    it('preserves the never-drop empty listing with a one-page envelope', async () => {
        installTransport({ docs: [] });
        const result = await BlogApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result.docs).toHaveLength(0);
        expect(result).toMatchObject({ totalDocs: 0, totalPages: 1, page: 1 });
    });
});

describe('BlogApi — emergency-shadow (CMS_READ_FLIP=-articles serves the Mongo snapshot)', () => {
    it('forwards page + limit + tag args', async () => {
        process.env.CMS_READ_FLIP = '-articles';
        vi.mocked(getArticles).mockResolvedValue({ docs: [mockArticle()] } as never);
        await BlogApi({ shop: mockShop(), locale: Locale.from('en-US'), page: 2, limit: 10, tag: 'news' });
        expect(getArticles).toHaveBeenCalledWith(
            expect.objectContaining({
                shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
                locale: { code: 'en-US' },
                page: 2,
                limit: 10,
                tag: 'news',
            }),
        );
    });

    it('defaults page to 1 and limit to 12', async () => {
        process.env.CMS_READ_FLIP = '-articles';
        vi.mocked(getArticles).mockResolvedValue({ docs: [] } as never);
        await BlogApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(getArticles).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 12 }));
    });
});
