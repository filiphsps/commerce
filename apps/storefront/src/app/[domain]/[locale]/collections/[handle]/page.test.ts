import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isValidHandle, NOT_FOUND_HANDLE } from '@/utils/handle';

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
    CollectionsApi: mockCollectionsApi,
}));

import { generateStaticParams } from './static-params';

describe('app/[domain]/[locale]/collections/[handle] > generateStaticParams', () => {
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

    it('returns the not-found sentinel when the catalog is empty (Cache Components requires >=1 entry)', async () => {
        mockCollectionsApi.mockRejectedValue(new NotFoundError('collections'));

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ handle: NOT_FOUND_HANDLE }]);
        expect(isValidHandle(NOT_FOUND_HANDLE)).toBe(false);
    });

    it('rethrows non-NotFound errors so real failures are still surfaced', async () => {
        const fetchError = new ProviderFetchError([{ message: 'boom' }]);
        mockCollectionsApi.mockRejectedValue(fetchError);

        await expect(generateStaticParams({ params })).rejects.toBe(fetchError);
    });
});
