import { getArticle } from '@nordcom/commerce-cms/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockArticle, mockShop } from '@/utils/test/fixtures';
import { __setCmsShadowTransport, type CmsShadowTransport, flushCmsShadows } from './_cms-shadow';
import { ArticleApi } from './article';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getArticle: vi.fn() };
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
    vi.mocked(getArticle).mockReset();
});

describe('ArticleApi — Convex-native default (CUTOVER-05)', () => {
    it('serves the Convex slug read untouched in the bare default env (SFREAD-01 byte-identity)', async () => {
        const article = mockArticle({ slug: 'launch-news' });
        const { queries } = installTransport(article);

        const result = await ArticleApi({ shop: mockShop(), locale: Locale.from('en-US'), slug: 'launch-news' });

        // Identity passthrough: the flip path applies no reshaping, so the contract-shaped
        // document the Convex read serves IS the getter result.
        expect(result).toBe(article);
        expect(queries).toEqual([
            {
                name: 'cms/read:articleBySlug',
                args: { shopId: 'mock-shop-id', slug: 'launch-news', locale: 'en-US' },
            },
        ]);
        // The Mongo leg is never consulted on a successful default-flipped read.
        expect(getArticle).not.toHaveBeenCalled();
    });

    it('serves the native ProseMirror body untouched — the exact document the RichText renderer consumes', async () => {
        // The CUTOVER-05 rich-text contract: post-flip article bodies are ProseMirror JSON
        // (the ETL/native-editor shape), the input `blocks/rich-text-renderer` renders 1:1 —
        // its golden-parity suite pins the DOM for this document class.
        const body = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'EN body' }] }],
        };
        installTransport(mockArticle({ slug: 'launch-news', body: body as never }));

        const result = await ArticleApi({ shop: mockShop(), locale: Locale.from('en-US'), slug: 'launch-news' });
        expect(result?.body).toBe(body);
    });

    it('preserves null-on-missing from the Convex read (overlay-only design)', async () => {
        installTransport(null);
        const result = await ArticleApi({ shop: mockShop(), locale: Locale.from('en-US'), slug: 'absent' });
        expect(result).toBeNull();
        expect(getArticle).not.toHaveBeenCalled();
    });
});

describe('ArticleApi — emergency-shadow (CMS_READ_FLIP=-article serves the Mongo snapshot)', () => {
    it('forwards slug, shop, locale', async () => {
        process.env.CMS_READ_FLIP = '-article';
        vi.mocked(getArticle).mockResolvedValue(mockArticle());
        await ArticleApi({ shop: mockShop(), locale: Locale.from('en-US'), slug: 'launch-news' });
        expect(getArticle).toHaveBeenCalledWith({
            shop: { id: 'mock-shop-id', domain: 'staging.storefront.localhost', i18n: { defaultLocale: 'en-US' } },
            locale: { code: 'en-US' },
            slug: 'launch-news',
            // Outside a request scope draft detection degrades to the published-only default.
            draft: false,
        });
    });

    it('returns null when no CMS article matches the slug (overlay-only design)', async () => {
        process.env.CMS_READ_FLIP = '-article';
        vi.mocked(getArticle).mockResolvedValue(null as never);
        const result = await ArticleApi({ shop: mockShop(), locale: Locale.from('en-US'), slug: 'absent' });
        expect(result).toBeNull();
    });
});
