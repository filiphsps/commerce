import { getPages } from '@nordcom/commerce-cms/api';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockCmsPage, mockShop } from '@/utils/test/fixtures';
import { __setCmsShadowTransport, flushCmsShadows } from './_cms-shadow';
import { PagesApi } from './page';

vi.mock('@nordcom/commerce-cms/api', async () => {
    const actual = await vi.importActual<typeof import('@nordcom/commerce-cms/api')>('@nordcom/commerce-cms/api');
    return { ...actual, getPages: vi.fn() };
});

describe('PagesApi', () => {
    it('returns the CMS pages list as Payload PaginatedDocs', async () => {
        const p1 = mockCmsPage({ id: 'p1', slug: 'home' });
        const p2 = mockCmsPage({ id: 'p2', slug: 'about' });
        vi.mocked(getPages).mockResolvedValue({ docs: [p1, p2] } as never);

        const result = await PagesApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result?.docs).toHaveLength(2);
        expect(result?.docs.map((p) => p.slug)).toEqual(['home', 'about']);
    });

    it('returns an empty list when there are no pages', async () => {
        vi.mocked(getPages).mockResolvedValue({ docs: [] } as never);
        const result = await PagesApi({ shop: mockShop(), locale: Locale.from('en-US') });
        expect(result?.docs).toHaveLength(0);
    });
});

describe('PagesApi shadow batching (SFREAD-13)', () => {
    afterEach(async () => {
        await flushCmsShadows();
        __setCmsShadowTransport(null);
        delete process.env.CMS_READ_SHADOW;
    });

    it('fires exactly one batched shadow read for the whole pages window — never one per sitemap entry', async () => {
        process.env.CMS_READ_SHADOW = '1';
        const queries: string[] = [];
        __setCmsShadowTransport({
            query: (name) => {
                queries.push(name);
                return Promise.resolve(null);
            },
            mutation: () => Promise.resolve(null),
        });
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
