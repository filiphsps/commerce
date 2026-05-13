import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isValidHandle, NOT_FOUND_HANDLE } from '@/utils/handle';

const { mockPagesApi, mockFindByDomain } = vi.hoisted(() => ({
    mockPagesApi: vi.fn(),
    mockFindByDomain: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: mockFindByDomain },
}));

vi.mock('@/api/page', () => ({
    PagesApi: mockPagesApi,
}));

import { generateStaticParams } from './static-params';

describe('app/[domain]/[locale]/[...slug] > generateStaticParams', () => {
    const params = { domain: 'shop.example.com', locale: 'en-US' };

    beforeEach(() => {
        mockPagesApi.mockReset();
        mockFindByDomain.mockReset();

        mockFindByDomain.mockResolvedValue({ id: 'shop-1', domain: params.domain });
    });

    it('returns CMS slugs as slug segments', async () => {
        mockPagesApi.mockResolvedValue({
            provider: 'cms',
            items: [{ slug: 'about' }, { slug: 'contact' }, { slug: null }],
        });

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ slug: ['about'] }, { slug: ['contact'] }]);
    });

    it('returns Shopify page handles as slug segments', async () => {
        mockPagesApi.mockResolvedValue({
            provider: 'shopify',
            items: [{ handle: 'about' }, { handle: 'shipping' }],
        });

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ slug: ['about'] }, { slug: ['shipping'] }]);
    });

    it('returns the not-found sentinel when PagesApi returns null (Cache Components requires >=1 entry)', async () => {
        mockPagesApi.mockResolvedValue(null);

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ slug: [NOT_FOUND_HANDLE] }]);
        expect(isValidHandle(NOT_FOUND_HANDLE)).toBe(false);
    });
});
