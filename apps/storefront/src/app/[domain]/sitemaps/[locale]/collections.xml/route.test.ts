import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
    unstable_cache: vi.fn().mockImplementation((func: any) => func),
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
}));

vi.mock('next/navigation', async () => ({
    ...(((await vi.importActual('next/navigation')) as any) || {}),
    notFound: vi.fn().mockImplementation(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: vi.fn().mockResolvedValue({
        query: vi.fn(),
        shop: vi.fn().mockReturnValue({ id: 'mock-shop-id', domain: 'staging.demo.nordcom.io' }),
        locale: vi.fn(),
    }),
}));

const CollectionsPaginationApiMock = vi.fn();
vi.mock('@/api/shopify/collection', () => ({
    CollectionsPaginationApi: CollectionsPaginationApiMock,
    extractLimitLikeFilters: vi.fn().mockReturnValue({ first: 75 }),
}));

const { GET } = await import('@/app/[domain]/sitemaps/[locale]/collections.xml/route');

function makeRequest(): Request {
    return new Request('http://staging.demo.nordcom.io/staging.demo.nordcom.io/sitemaps/en-US/collections.xml');
}

describe('app/[domain]/sitemaps/[locale]/collections.xml', () => {
    describe('GET', () => {
        it('returns 200 with XML content-type', async () => {
            CollectionsPaginationApiMock.mockResolvedValueOnce({
                collections: [{ node: { handle: 'test-collection', updatedAt: '2024-01-01T00:00:00Z' } }],
                page_info: { end_cursor: null, has_next_page: false },
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('text/xml');
        });

        it('includes collection handles in the sitemap body', async () => {
            CollectionsPaginationApiMock.mockResolvedValueOnce({
                collections: [
                    { node: { handle: 'summer-sale', updatedAt: '2024-01-01T00:00:00Z' } },
                    { node: { handle: 'winter-collection', updatedAt: '2024-02-01T00:00:00Z' } },
                ],
                page_info: { end_cursor: null, has_next_page: false },
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            const body = await res.text();
            expect(body).toContain('<urlset');
            expect(body).toContain('summer-sale');
            expect(body).toContain('winter-collection');
        });

        it('includes locale code and shop domain in collection URLs', async () => {
            CollectionsPaginationApiMock.mockResolvedValueOnce({
                collections: [{ node: { handle: 'demo-collection', updatedAt: '2024-01-01T00:00:00Z' } }],
                page_info: { end_cursor: null, has_next_page: false },
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            const body = await res.text();
            expect(body).toContain('https://staging.demo.nordcom.io/en-US/collections/demo-collection/');
        });

        it('returns a valid empty urlset when no collections exist', async () => {
            CollectionsPaginationApiMock.mockResolvedValueOnce(null);

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            expect(res.status).toBe(200);
            const body = await res.text();
            expect(body).toContain('<urlset');
        });

        it('paginates through multiple pages of collections', async () => {
            CollectionsPaginationApiMock.mockResolvedValueOnce({
                collections: [{ node: { handle: 'collection-page-1', updatedAt: '2024-01-01T00:00:00Z' } }],
                page_info: { end_cursor: 'cursor-1', has_next_page: true },
            }).mockResolvedValueOnce({
                collections: [{ node: { handle: 'collection-page-2', updatedAt: '2024-01-02T00:00:00Z' } }],
                page_info: { end_cursor: null, has_next_page: false },
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            const body = await res.text();
            expect(body).toContain('collection-page-1');
            expect(body).toContain('collection-page-2');
        });
    });
});
