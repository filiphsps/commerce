import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isValidHandle, NOT_FOUND_HANDLE } from '@/utils/handle';

const { mockBlogApi, mockShopifyApolloApiClient, mockFindByDomain } = vi.hoisted(() => ({
    mockBlogApi: vi.fn(),
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
    BlogApi: mockBlogApi,
}));

import { generateStaticParams } from './static-params';

describe('app/[domain]/[locale]/blogs/[blog]/[handle] > generateStaticParams', () => {
    const params = { domain: 'shop.example.com', locale: 'en-US', blog: 'announcements' };

    beforeEach(() => {
        mockBlogApi.mockReset();
        mockShopifyApolloApiClient.mockReset();
        mockFindByDomain.mockReset();

        mockFindByDomain.mockResolvedValue({ id: 'shop-1', domain: params.domain });
        mockShopifyApolloApiClient.mockResolvedValue({ query: vi.fn() });
    });

    it('passes the blog handle from route params to BlogApi (not the default)', async () => {
        mockBlogApi.mockResolvedValue([{ articles: { edges: [] } }, undefined]);

        await generateStaticParams({ params });

        expect(mockBlogApi).toHaveBeenCalledTimes(1);
        const callArg = mockBlogApi.mock.calls[0]![0];
        expect(callArg.handle).toBe('announcements');
    });

    it('returns each article handle for the blog', async () => {
        mockBlogApi.mockResolvedValue([
            {
                articles: {
                    edges: [{ node: { handle: 'launch-day' } }, { node: { handle: 'roadmap-update' } }],
                },
            },
            undefined,
        ]);

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ handle: 'launch-day' }, { handle: 'roadmap-update' }]);
    });

    it('returns the not-found sentinel when the blog is not found (Cache Components requires >=1 entry)', async () => {
        mockBlogApi.mockResolvedValue([undefined, new NotFoundError('blog')]);

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ handle: NOT_FOUND_HANDLE }]);
        // Runtime page falls through to notFound() via isValidHandle rejection.
        expect(isValidHandle(NOT_FOUND_HANDLE)).toBe(false);
    });

    it('returns the not-found sentinel when the blog has no articles (Cache Components requires >=1 entry)', async () => {
        mockBlogApi.mockResolvedValue([{ articles: { edges: [] } }, undefined]);

        const result = await generateStaticParams({ params });

        expect(result).toEqual([{ handle: NOT_FOUND_HANDLE }]);
    });

    it('rethrows non-NotFound errors so real failures are still surfaced', async () => {
        const fetchError = new ProviderFetchError([{ message: 'boom' }]);
        mockBlogApi.mockResolvedValue([undefined, fetchError]);

        await expect(generateStaticParams({ params })).rejects.toBe(fetchError);
    });
});
