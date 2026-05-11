import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
    unstable_cache: vi.fn().mockImplementation((func: any) => func),
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: vi.fn().mockResolvedValue({
        query: vi.fn(),
        shop: vi.fn().mockReturnValue({ id: 'mock-shop-id', domain: 'staging.demo.nordcom.io' }),
        locale: vi.fn(),
    }),
}));

vi.mock('@/api/store', () => ({
    LocalesApi: vi.fn().mockResolvedValue([{ code: 'en-US' }, { code: 'sv-SE' }]),
}));

const { GET } = await import('@/app/[domain]/sitemap.xml/route');

function makeRequest(): Request {
    return new Request('http://staging.demo.nordcom.io/staging.demo.nordcom.io/sitemap.xml');
}

describe('app/[domain]/sitemap.xml', () => {
    describe('GET', () => {
        it('returns 200 with XML content-type', async () => {
            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            expect(res.status).toBe(200);
            const contentType = res.headers.get('content-type');
            expect(contentType).toContain('text/xml');
        });

        it('returns a sitemap index with pages.xml entry', async () => {
            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('<sitemapindex');
            expect(body).toContain('pages.xml');
        });

        it('includes per-locale product, collection, and blog sitemap entries for each locale', async () => {
            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('en-US/products.xml');
            expect(body).toContain('en-US/collections.xml');
            expect(body).toContain('en-US/blogs.xml');
            expect(body).toContain('sv-SE/products.xml');
            expect(body).toContain('sv-SE/collections.xml');
            expect(body).toContain('sv-SE/blogs.xml');
        });

        it('uses the shop domain as the base URL for all sitemap hrefs', async () => {
            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('https://staging.demo.nordcom.io/sitemaps');
        });
    });
});
