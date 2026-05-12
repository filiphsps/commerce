import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isValidHandle, NOT_FOUND_HANDLE } from '@/utils/handle';

const { mockBlogsApi, mockShopifyApolloApiClient, mockFindByDomain } = vi.hoisted(() => ({
    mockBlogsApi: vi.fn(),
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

vi.mock('@/api/shopify/blog', () => ({
    BlogsApi: mockBlogsApi,
}));

import { generateStaticParams } from './static-params';

describe('app/[domain]/[locale]/blogs/[blog] > generateStaticParams', () => {
    const params = { domain: 'shop.example.com', locale: 'en-US' };

    beforeEach(() => {
        mockBlogsApi.mockReset();
        mockShopifyApolloApiClient.mockReset();
        mockFindByDomain.mockReset();

        mockFindByDomain.mockResolvedValue({ id: 'shop-1', domain: params.domain });
        mockShopifyApolloApiClient.mockResolvedValue({ query: vi.fn() });
    });

    it('returns each blog handle', async () => {
        mockBlogsApi.mockResolvedValue([[{ handle: 'news' }, { handle: 'announcements' }], undefined]);

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ blog: 'news' }, { blog: 'announcements' }]);
    });

    it('returns the not-found sentinel when no blogs are found (Cache Components requires >=1 entry)', async () => {
        mockBlogsApi.mockResolvedValue([undefined, new NotFoundError('blogs')]);

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ blog: NOT_FOUND_HANDLE }]);
        // Runtime page falls through to notFound() via isValidHandle rejection.
        expect(isValidHandle(NOT_FOUND_HANDLE)).toBe(false);
    });

    it('rethrows non-NotFound errors so real failures are still surfaced', async () => {
        const fetchError = new ProviderFetchError([{ message: 'boom' }]);
        mockBlogsApi.mockResolvedValue([undefined, fetchError]);

        await expect(generateStaticParams({ params })).rejects.toBe(fetchError);
    });
});
