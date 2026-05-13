import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
    unstable_cache: vi.fn().mockImplementation((func: any) => func),
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn().mockResolvedValue({
            id: 'mock-shop-id',
            domain: 'staging.demo.nordcom.io',
            contentProvider: {
                type: 'shopify' as const,
            },
            commerceProvider: {
                type: 'shopify' as const,
                domain: 'mock.shop',
                authentication: {
                    publicToken: 'public-token',
                    token: 'private-token',
                },
            },
            design: { accents: [] },
        }),
    },
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApiClient: vi.fn().mockResolvedValue({
        query: vi.fn(),
        shop: vi.fn().mockReturnValue({ id: 'mock-shop-id', domain: 'staging.demo.nordcom.io' }),
        locale: vi.fn(),
    }),
    ShopifyApolloApiClient: vi.fn().mockResolvedValue({
        query: vi.fn(),
        shop: vi.fn().mockReturnValue({ id: 'mock-shop-id', domain: 'staging.demo.nordcom.io' }),
        locale: vi.fn(),
    }),
}));

vi.mock('@/api/store', () => ({
    LocalesApi: vi.fn().mockResolvedValue([{ code: 'en-US' }]),
}));

const PagesApiMock = vi.fn();
vi.mock('@/api/page', () => ({
    PagesApi: PagesApiMock,
}));

const { GET } = await import('@/app/[domain]/sitemaps/pages.xml/route');

function makeRequest(): Request {
    return new Request('http://staging.demo.nordcom.io/staging.demo.nordcom.io/sitemaps/pages.xml');
}

describe('app/[domain]/sitemaps/pages.xml', () => {
    describe('GET', () => {
        it('returns 200 with XML content-type', async () => {
            PagesApiMock.mockResolvedValueOnce({
                provider: 'shopify' as const,
                items: [{ handle: 'about', updatedAt: '2024-01-01T00:00:00Z' }],
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('text/xml');
        });

        it('includes page handle in the sitemap body for shopify provider', async () => {
            PagesApiMock.mockResolvedValueOnce({
                provider: 'shopify' as const,
                items: [
                    { handle: 'about', updatedAt: '2024-01-01T00:00:00Z' },
                    { handle: 'contact', updatedAt: '2024-02-01T00:00:00Z' },
                ],
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('<urlset');
            expect(body).toContain('about');
            expect(body).toContain('contact');
        });

        it('includes locale code and shop domain in page URLs for shopify provider', async () => {
            PagesApiMock.mockResolvedValueOnce({
                provider: 'shopify' as const,
                items: [{ handle: 'about', updatedAt: '2024-01-01T00:00:00Z' }],
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('https://staging.demo.nordcom.io/en-US/about/');
        });

        it('returns a valid empty urlset when PagesApi returns null', async () => {
            PagesApiMock.mockResolvedValueOnce(null);

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            expect(res.status).toBe(200);
            const body = await res.text();
            expect(body).toContain('<urlset');
        });

        it('includes CMS page URLs when provider is cms', async () => {
            PagesApiMock.mockResolvedValueOnce({
                provider: 'cms' as const,
                items: [
                    {
                        slug: 'about',
                        updatedAt: '2024-01-01T00:00:00.000Z',
                    },
                ],
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('<urlset');
            expect(body).toContain('about');
        });

        it('generates entries for each locale', async () => {
            const { LocalesApi } = await import('@/api/store');
            vi.mocked(LocalesApi).mockResolvedValueOnce([{ code: 'en-US' }, { code: 'sv-SE' }] as any);

            PagesApiMock.mockResolvedValueOnce({
                provider: 'shopify' as const,
                items: [{ handle: 'about', updatedAt: '2024-01-01T00:00:00Z' }],
            });

            const res = await GET(makeRequest() as any, {
                params: Promise.resolve({ domain: 'staging.demo.nordcom.io' }),
            });

            const body = await res.text();
            expect(body).toContain('en-US/about');
            expect(body).toContain('sv-SE/about');
        });
    });
});
