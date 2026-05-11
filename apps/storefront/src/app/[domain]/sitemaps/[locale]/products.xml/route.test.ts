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

const ProductsPaginationApiMock = vi.fn();
vi.mock('@/api/shopify/product', () => ({
    ProductsPaginationApi: ProductsPaginationApiMock,
}));

const { GET } = await import('@/app/[domain]/sitemaps/[locale]/products.xml/route');

function makeRequest(): Request {
    return new Request('http://staging.demo.nordcom.io/staging.demo.nordcom.io/sitemaps/en-US/products.xml');
}

describe('app/[domain]/sitemaps/[locale]/products.xml', () => {
    describe('GET', () => {
        it('returns 200 with XML content-type', async () => {
            ProductsPaginationApiMock.mockResolvedValueOnce({
                products: [{ node: { handle: 'test-product', updatedAt: '2024-01-01T00:00:00Z' } }],
                page_info: { end_cursor: null, has_next_page: false },
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('text/xml');
        });

        it('includes product handles in the sitemap body', async () => {
            ProductsPaginationApiMock.mockResolvedValueOnce({
                products: [
                    { node: { handle: 'my-product', updatedAt: '2024-01-01T00:00:00Z' } },
                    { node: { handle: 'another-product', updatedAt: '2024-02-01T00:00:00Z' } },
                ],
                page_info: { end_cursor: null, has_next_page: false },
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            const body = await res.text();
            expect(body).toContain('<urlset');
            expect(body).toContain('my-product');
            expect(body).toContain('another-product');
        });

        it('includes locale code and shop domain in product URLs', async () => {
            ProductsPaginationApiMock.mockResolvedValueOnce({
                products: [{ node: { handle: 'demo-product', updatedAt: '2024-01-01T00:00:00Z' } }],
                page_info: { end_cursor: null, has_next_page: false },
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            const body = await res.text();
            expect(body).toContain('https://staging.demo.nordcom.io/en-US/products/demo-product/');
        });

        it('returns a valid empty urlset when no products exist', async () => {
            ProductsPaginationApiMock.mockResolvedValueOnce(null);

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            expect(res.status).toBe(200);
            const body = await res.text();
            expect(body).toContain('<urlset');
        });

        it('paginates through multiple pages of products', async () => {
            ProductsPaginationApiMock.mockResolvedValueOnce({
                products: [{ node: { handle: 'product-page-1', updatedAt: '2024-01-01T00:00:00Z' } }],
                page_info: { end_cursor: 'cursor-1', has_next_page: true },
            }).mockResolvedValueOnce({
                products: [{ node: { handle: 'product-page-2', updatedAt: '2024-01-02T00:00:00Z' } }],
                page_info: { end_cursor: null, has_next_page: false },
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            const body = await res.text();
            expect(body).toContain('product-page-1');
            expect(body).toContain('product-page-2');
        });
    });
});
