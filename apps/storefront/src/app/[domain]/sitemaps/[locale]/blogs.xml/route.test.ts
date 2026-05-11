import { NotFoundError } from '@nordcom/commerce-errors';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
    unstable_cache: vi.fn().mockImplementation((func: any) => func),
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
}));

const notFoundMock = vi.fn().mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', async () => ({
    ...(((await vi.importActual('next/navigation')) as any) || {}),
    notFound: notFoundMock,
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: vi.fn().mockResolvedValue({
        query: vi.fn(),
        shop: vi.fn().mockReturnValue({ id: 'mock-shop-id', domain: 'staging.demo.nordcom.io' }),
        locale: vi.fn(),
    }),
}));

const BlogsApiMock = vi.fn();
const BlogApiMock = vi.fn();
vi.mock('@/api/shopify/blog', () => ({
    BlogsApi: BlogsApiMock,
    BlogApi: BlogApiMock,
}));

const { GET } = await import('@/app/[domain]/sitemaps/[locale]/blogs.xml/route');

function makeRequest(): Request {
    return new Request('http://staging.demo.nordcom.io/staging.demo.nordcom.io/sitemaps/en-US/blogs.xml');
}

describe('app/[domain]/sitemaps/[locale]/blogs.xml', () => {
    describe('GET', () => {
        it('returns 200 with XML content-type when blogs exist', async () => {
            BlogsApiMock.mockResolvedValueOnce([
                [{ handle: 'news' }],
                undefined,
            ]);
            BlogApiMock.mockResolvedValueOnce([
                {
                    handle: 'news',
                    articles: {
                        edges: [
                            { node: { handle: 'my-article', publishedAt: '2024-01-01T00:00:00Z' } },
                        ],
                    },
                },
                undefined,
            ]);

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('text/xml');
        });

        it('includes blog and article handles in the sitemap body', async () => {
            BlogsApiMock.mockResolvedValueOnce([
                [{ handle: 'news' }],
                undefined,
            ]);
            BlogApiMock.mockResolvedValueOnce([
                {
                    handle: 'news',
                    articles: {
                        edges: [
                            { node: { handle: 'first-post', publishedAt: '2024-01-01T00:00:00Z' } },
                            { node: { handle: 'second-post', publishedAt: '2024-02-01T00:00:00Z' } },
                        ],
                    },
                },
                undefined,
            ]);

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            const body = await res.text();
            expect(body).toContain('<urlset');
            // blog index URL
            expect(body).toContain('https://staging.demo.nordcom.io/en-US/blogs/news/');
            // article URLs
            expect(body).toContain('first-post');
            expect(body).toContain('second-post');
        });

        it('calls notFound when BlogsApi returns a NotFoundError', async () => {
            BlogsApiMock.mockResolvedValueOnce([undefined, new NotFoundError('Blogs not found')]);

            await expect(
                GET(makeRequest() as any, {
                    params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
                }),
            ).rejects.toThrow('NEXT_NOT_FOUND');
        });

        it('returns valid XML with empty urlset when BlogApi returns no articles for a blog', async () => {
            BlogsApiMock.mockResolvedValueOnce([
                [{ handle: 'news' }],
                undefined,
            ]);
            BlogApiMock.mockResolvedValueOnce([
                {
                    handle: 'news',
                    articles: { edges: [] },
                },
                undefined,
            ]);

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io', locale: 'en-US' }),
            });

            expect(res.status).toBe(200);
            const body = await res.text();
            expect(body).toContain('<urlset');
        });
    });
});
