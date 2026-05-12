import { NotFoundError, ProviderFetchError } from '@nordcom/commerce-errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    BlogApi: vi.fn(),
    BlogsApi: mockBlogsApi,
}));

import { generateStaticParams } from './page';

describe('app/[domain]/[locale]/blogs/[blog]/page > generateStaticParams', () => {
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

    it('returns an empty array when no blogs are found (build resilience)', async () => {
        mockBlogsApi.mockResolvedValue([undefined, new NotFoundError('blogs')]);

        const result = await generateStaticParams({ params });

        expect(result).toEqual([]);
    });

    it('rethrows non-NotFound errors so real failures are still surfaced', async () => {
        const fetchError = new ProviderFetchError([{ message: 'boom' }]);
        mockBlogsApi.mockResolvedValue([undefined, fetchError]);

        await expect(generateStaticParams({ params })).rejects.toBe(fetchError);
    });
});
