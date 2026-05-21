import { getPages } from '@nordcom/commerce-cms/api';
import { describe, expect, it, vi } from 'vitest';
import { Locale } from '@/utils/locale';
import { mockCmsPage, mockShop } from '@/utils/test/fixtures';
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
