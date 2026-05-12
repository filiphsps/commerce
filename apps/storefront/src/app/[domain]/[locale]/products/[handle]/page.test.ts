import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockProductsApi, mockShopifyApiClient, mockFindByDomain } = vi.hoisted(() => ({
    mockProductsApi: vi.fn(),
    mockShopifyApiClient: vi.fn(),
    mockFindByDomain: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: mockFindByDomain },
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApiClient: mockShopifyApiClient,
    ShopifyApolloApiClient: vi.fn(),
}));

vi.mock('@/api/shopify/product', () => ({
    ProductApi: vi.fn(),
    ProductsApi: mockProductsApi,
}));

import { generateStaticParams } from './page';

describe('app/[domain]/[locale]/products/[handle]/page > generateStaticParams', () => {
    const params = { domain: 'shop.example.com', locale: 'en-US' };

    beforeEach(() => {
        mockProductsApi.mockReset();
        mockShopifyApiClient.mockReset();
        mockFindByDomain.mockReset();

        mockFindByDomain.mockResolvedValue({ id: 'shop-1', domain: params.domain });
        mockShopifyApiClient.mockResolvedValue({ query: vi.fn() });
    });

    it('returns the handle of every product', async () => {
        mockProductsApi.mockResolvedValue({
            products: [{ node: { handle: 'product-a' } }, { node: { handle: 'product-b' } }],
        });

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ handle: 'product-a' }, { handle: 'product-b' }]);
    });

    it('returns an empty array when the catalog is empty (build resilience)', async () => {
        mockProductsApi.mockRejectedValue(new NotFoundError('products'));

        const result = await generateStaticParams({ params });

        expect(result).toEqual([]);
    });

    it('rethrows non-NotFound errors so real failures are still surfaced', async () => {
        const fetchError = new ProviderFetchError([{ message: 'boom' }]);
        mockProductsApi.mockRejectedValue(fetchError);

        await expect(generateStaticParams({ params })).rejects.toBe(fetchError);
    });
});
