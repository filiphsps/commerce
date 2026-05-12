import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPagesApi, mockPageApi, mockShopifyApolloApiClient, mockFindByDomain } = vi.hoisted(() => ({
    mockPagesApi: vi.fn(),
    mockPageApi: vi.fn(),
    mockShopifyApolloApiClient: vi.fn(),
    mockFindByDomain: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: mockFindByDomain },
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: mockShopifyApolloApiClient,
}));

vi.mock('@/api/page', () => ({
    PageApi: mockPageApi,
    PagesApi: mockPagesApi,
}));

import { generateStaticParams } from './page';

describe('app/[domain]/[locale]/[...slug]/page > generateStaticParams', () => {
    const params = { domain: 'shop.example.com', locale: 'en-US' };

    beforeEach(() => {
        mockPagesApi.mockReset();
        mockPageApi.mockReset();
        mockShopifyApolloApiClient.mockReset();
        mockFindByDomain.mockReset();

        mockFindByDomain.mockResolvedValue({ id: 'shop-1', domain: params.domain });
        mockShopifyApolloApiClient.mockResolvedValue({ query: vi.fn() });
    });

    it('returns Prismic UIDs as slug segments', async () => {
        mockPagesApi.mockResolvedValue({
            provider: 'prismic',
            items: [{ uid: 'about' }, { uid: 'contact' }, { uid: null }],
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

    it('returns an empty array when PagesApi returns null (build resilience)', async () => {
        mockPagesApi.mockResolvedValue(null);

        const result = await generateStaticParams({ params });

        expect(result).toEqual([]);
    });
});
