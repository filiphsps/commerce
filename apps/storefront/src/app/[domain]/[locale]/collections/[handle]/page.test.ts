import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCollectionsApi, mockShopifyApolloApiClient, mockFindByDomain } = vi.hoisted(() => ({
    mockCollectionsApi: vi.fn(),
    mockShopifyApolloApiClient: vi.fn(),
    mockFindByDomain: vi.fn(),
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: mockFindByDomain },
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: mockShopifyApolloApiClient,
}));

vi.mock('@/api/shopify/collection', () => ({
    CollectionApi: vi.fn(),
    CollectionPaginationCountApi: vi.fn(),
    CollectionsApi: mockCollectionsApi,
}));

import { generateStaticParams } from './page';

describe('app/[domain]/[locale]/collections/[handle]/page > generateStaticParams', () => {
    const params = { domain: 'shop.example.com', locale: 'en-US' };

    beforeEach(() => {
        mockCollectionsApi.mockReset();
        mockShopifyApolloApiClient.mockReset();
        mockFindByDomain.mockReset();

        mockFindByDomain.mockResolvedValue({ id: 'shop-1', domain: params.domain });
        mockShopifyApolloApiClient.mockResolvedValue({ query: vi.fn() });
    });

    it('returns the handle of every collection', async () => {
        mockCollectionsApi.mockResolvedValue([
            { id: 'c1', handle: 'sale', hasProducts: true },
            { id: 'c2', handle: 'new-arrivals', hasProducts: true },
        ]);

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ handle: 'sale' }, { handle: 'new-arrivals' }]);
    });

    it('returns an empty array when the catalog is empty (build resilience)', async () => {
        mockCollectionsApi.mockRejectedValue(new NotFoundError('collections'));

        const result = await generateStaticParams({ params });

        expect(result).toEqual([]);
    });

    it('rethrows non-NotFound errors so real failures are still surfaced', async () => {
        const fetchError = new ProviderFetchError([{ message: 'boom' }]);
        mockCollectionsApi.mockRejectedValue(fetchError);

        await expect(generateStaticParams({ params })).rejects.toBe(fetchError);
    });
});
