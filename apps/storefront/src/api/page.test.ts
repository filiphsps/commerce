import { getPages } from '@nordcom/commerce-cms/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockCmsPage, mockShop } from '@/utils/test/fixtures';
import { __setCmsShadowTransport, type CmsShadowTransport, flushCmsShadows } from './_cms-shadow';
import { PagesApi } from './page';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getPages: vi.fn() };
});

/**
 * Installs a capturing shadow transport whose query resolves with the supplied value.
 *
 * @param value - The value every Convex query resolves with.
 * @returns The captured query names.
 */
function installTransport(value: unknown): { queries: string[] } {
    const queries: string[] = [];
    const transport: CmsShadowTransport = {
        query: (name) => {
            queries.push(name);
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
    delete process.env.CMS_READ_SHADOW;
    vi.mocked(getPages).mockReset();
});

describe('PagesApi — Convex-native default (CUTOVER-04)', () => {
    it('serves the Convex listing and rebuilds the frozen single-window envelope around the docs untouched', async () => {
        const docs = [mockCmsPage({ id: 'p1', slug: 'about' }), mockCmsPage({ id: 'p2', slug: 'home' })];
        const { queries } = installTransport({ docs });

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
        expect(getPages).not.toHaveBeenCalled();
    });

    it('preserves the never-drop empty listing', async () => {
        installTransport({ docs: [] });
        const result = await PagesApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result.docs).toHaveLength(0);
    });

    it('costs exactly ONE bounded Convex read for a 1000-page window — the sitemap/warmer build budget', async () => {
        const docs = Array.from({ length: 1000 }, (...[, index]) =>
            mockCmsPage({ id: `p${index}`, slug: `page-${index}` }),
        );
        const { queries } = installTransport({ docs });

        const result = await PagesApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result.docs).toHaveLength(1000);
        expect(queries).toEqual(['cms/read:pages']);
    });
});

describe('PagesApi — emergency-shadow (CMS_READ_FLIP=-pages serves the Mongo snapshot)', () => {
    it('returns the CMS pages list as Payload PaginatedDocs', async () => {
        process.env.CMS_READ_FLIP = '-pages';
        const p1 = mockCmsPage({ id: 'p1', slug: 'home' });
        const p2 = mockCmsPage({ id: 'p2', slug: 'about' });
        vi.mocked(getPages).mockResolvedValue({ docs: [p1, p2] } as never);

        const result = await PagesApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result?.docs).toHaveLength(2);
        expect(result?.docs.map((p) => p.slug)).toEqual(['home', 'about']);
    });

    it('returns an empty list when there are no pages', async () => {
        process.env.CMS_READ_FLIP = '-pages';
        vi.mocked(getPages).mockResolvedValue({ docs: [] } as never);
        const result = await PagesApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result?.docs).toHaveLength(0);
    });
});

describe('PagesApi shadow batching (SFREAD-13, emergency-shadow mode)', () => {
    it('fires exactly one batched shadow read for the whole pages window — never one per sitemap entry', async () => {
        process.env.CMS_READ_FLIP = '-pages';
        process.env.CMS_READ_SHADOW = '1';
        const { queries } = installTransport(null);
        const docs = Array.from({ length: 1000 }, (...[, index]) =>
            mockCmsPage({ id: `p${index}`, slug: `page-${index}` }),
        );
        vi.mocked(getPages).mockResolvedValue({ docs } as never);

        const result = await PagesApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result?.docs).toHaveLength(1000);

        await flushCmsShadows();
        // A 1000-page sitemap render costs ONE `cms/read:pages` shadow comparison — the
        // build-budget invariant pages.xml and the `[...slug]` warmer rely on.
        expect(queries).toEqual(['cms/read:pages']);
    });
});
