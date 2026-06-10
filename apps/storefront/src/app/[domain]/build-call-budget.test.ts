import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { maxConvexCallsPerBuild } from '@/utils/build-budget';

const {
    mockFindAll,
    mockFindByDomain,
    mockPagesApi,
    mockLocalesApi,
    mockLoaderBlogApi,
    mockProductHandlesApi,
    mockProductsPaginationApi,
    mockCollectionsApi,
    mockCollectionsPaginationApi,
    mockBlogsApi,
} = vi.hoisted(() => ({
    mockFindAll: vi.fn(),
    mockFindByDomain: vi.fn(),
    mockPagesApi: vi.fn(),
    mockLocalesApi: vi.fn(),
    mockLoaderBlogApi: vi.fn(),
    mockProductHandlesApi: vi.fn(),
    mockProductsPaginationApi: vi.fn(),
    mockCollectionsApi: vi.fn(),
    mockCollectionsPaginationApi: vi.fn(),
    mockBlogsApi: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('next/cache', () => ({
    unstable_cache: vi.fn().mockImplementation((func: unknown) => func),
    cacheLife: vi.fn(),
    cacheTag: vi.fn(),
}));

vi.mock('next/navigation', async () => ({
    ...((await vi.importActual('next/navigation')) as Record<string, unknown>),
    notFound: vi.fn().mockImplementation(() => {
        throw new TypeError('NEXT_NOT_FOUND');
    }),
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: { findByDomain: mockFindByDomain, findAll: mockFindAll },
}));

vi.mock('@/api/_loaders', () => ({
    Shop: { findByDomain: mockFindByDomain, findAll: mockFindAll },
    PagesApi: mockPagesApi,
    LocalesApi: mockLocalesApi,
    BlogApi: mockLoaderBlogApi,
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApiClient: vi.fn().mockImplementation(({ shop }: { shop: { id: string; domain: string } }) =>
        Promise.resolve({
            query: vi.fn(),
            shop: vi.fn().mockReturnValue(shop),
            locale: vi.fn(),
        }),
    ),
    ShopifyApolloApiClient: vi.fn().mockImplementation(({ shop }: { shop: { id: string; domain: string } }) =>
        Promise.resolve({
            query: vi.fn(),
            shop: vi.fn().mockReturnValue(shop),
            locale: vi.fn(),
        }),
    ),
}));

vi.mock('@/api/shopify/product', () => ({
    ProductHandlesApi: mockProductHandlesApi,
    ProductsPaginationApi: mockProductsPaginationApi,
}));

vi.mock('@/api/shopify/collection', () => ({
    CollectionsApi: mockCollectionsApi,
    CollectionsPaginationApi: mockCollectionsPaginationApi,
}));

vi.mock('@/api/shopify/blog', () => ({
    BlogsApi: mockBlogsApi,
}));

const { generateStaticParams: rootStaticParams } = await import('@/app/[domain]/[locale]/static-params');
const { generateStaticParams: productStaticParams } = await import(
    '@/app/[domain]/[locale]/products/[handle]/static-params'
);
const { generateStaticParams: collectionStaticParams } = await import(
    '@/app/[domain]/[locale]/collections/[handle]/static-params'
);
const { generateStaticParams: slugStaticParams } = await import('@/app/[domain]/[locale]/[...slug]/static-params');
const { generateStaticParams: blogStaticParams } = await import('@/app/[domain]/[locale]/blogs/[blog]/static-params');
const { generateStaticParams: articleStaticParams } = await import(
    '@/app/[domain]/[locale]/blogs/[blog]/[handle]/static-params'
);
const { GET: sitemapIndexGet } = await import('@/app/[domain]/sitemap.xml/route');
const { GET: robotsGet } = await import('@/app/[domain]/robots.txt/route');
const { GET: pagesSitemapGet } = await import('@/app/[domain]/sitemaps/pages.xml/route');
const { GET: productsSitemapGet } = await import('@/app/[domain]/sitemaps/[locale]/products.xml/route');
const { GET: collectionsSitemapGet } = await import('@/app/[domain]/sitemaps/[locale]/collections.xml/route');
const { GET: blogsSitemapGet } = await import('@/app/[domain]/sitemaps/[locale]/blogs.xml/route');

/** The synthetic fan-out one budget run enumerates. */
type Scenario = {
    /** Live tenant count (`N`). */
    tenants: number;
    /** Blogs per tenant (`B`). */
    blogsPerTenant: number;
    /** Runtime locales per tenant (`L`). */
    localesPerTenant: number;
    /** Catalog/content size per entity (`M`) — products, collections, CMS pages, articles. */
    catalogSize: number;
};

/**
 * Points every mocked backend at a synthetic platform of `scenario`-sized tenants.
 * Convex-billed seams (`Shop.findAll`, `Shop.findByDomain`, `PagesApi`) count via their mocks;
 * Shopify-side enumerations return `catalogSize` entries so call counts can be proven
 * independent of content volume.
 *
 * @param scenario - The fan-out to seed.
 * @returns The synthetic tenant domains.
 */
function seedPlatform(scenario: Scenario): string[] {
    const domains = Array.from({ length: scenario.tenants }, (...[, index]) => `tenant-${index}.example.com`);
    const locales = Array.from({ length: scenario.localesPerTenant }, (...[, index]) => ({
        code: index === 0 ? 'en-US' : `x${index}-XX`,
    }));
    const blogs = Array.from({ length: scenario.blogsPerTenant }, (...[, index]) => ({ handle: `blog-${index}` }));
    const articles = Array.from({ length: scenario.catalogSize }, (...[, index]) => ({
        node: { handle: `article-${index}`, publishedAt: '2026-01-01T00:00:00Z' },
    }));

    mockFindAll.mockResolvedValue(domains.map((domain) => ({ id: domain, domain })));
    mockFindByDomain.mockImplementation((domain: string) => Promise.resolve({ id: domain, domain }));
    mockPagesApi.mockResolvedValue({
        docs: Array.from({ length: scenario.catalogSize }, (...[, index]) => ({
            slug: `page-${index}`,
            updatedAt: '2026-01-01T00:00:00Z',
        })),
    });
    mockLocalesApi.mockResolvedValue(locales);
    mockBlogsApi.mockResolvedValue([blogs, null]);
    mockLoaderBlogApi.mockResolvedValue([{ articles: { edges: articles } }, null]);
    mockProductHandlesApi.mockImplementation(({ limit }: { limit: number }) =>
        Promise.resolve(
            Array.from({ length: Math.min(limit, scenario.catalogSize) }, (...[, index]) => `product-${index}`),
        ),
    );
    mockProductsPaginationApi.mockResolvedValue({
        products: Array.from({ length: scenario.catalogSize }, (...[, index]) => ({
            node: { handle: `product-${index}`, updatedAt: '2026-01-01T00:00:00Z' },
        })),
        page_info: { end_cursor: null, has_next_page: false },
    });
    mockCollectionsApi.mockResolvedValue(
        Array.from({ length: scenario.catalogSize }, (...[, index]) => ({ handle: `collection-${index}` })),
    );
    mockCollectionsPaginationApi.mockResolvedValue({
        collections: Array.from({ length: scenario.catalogSize }, (...[, index]) => ({
            node: { handle: `collection-${index}`, updatedAt: '2026-01-01T00:00:00Z' },
        })),
        page_info: { end_cursor: null, has_next_page: false },
    });

    return domains;
}

/**
 * Drives one full build-plus-first-crawl cycle: the root static-params batch, every nested
 * static-params warmer per emitted tenant param, then a first render of every SEO route
 * (sitemap index, robots, pages.xml, and the three per-locale sitemaps).
 *
 * @param scenario - The synthetic fan-out to enumerate.
 * @returns The number of Convex-billed calls the cycle issued.
 */
async function runBuildCycle(scenario: Scenario): Promise<number> {
    seedPlatform(scenario);
    const request = new Request('https://build.invalid/');
    const localeCodes = (await mockLocalesApi()).map(({ code }: { code: string }) => code);

    const rootParams = await rootStaticParams();
    expect(rootParams).toHaveLength(scenario.tenants);

    for (const { domain, locale } of rootParams) {
        const params = { domain, locale };
        await productStaticParams({ params });
        await collectionStaticParams({ params });
        await slugStaticParams({ params });
        const blogParams = await blogStaticParams({ params });
        expect(blogParams).toHaveLength(scenario.blogsPerTenant);
        for (const { blog } of blogParams) {
            await articleStaticParams({ params: { ...params, blog } });
        }
    }

    for (const { domain } of rootParams) {
        await sitemapIndexGet(request as never, { params: Promise.resolve({ domain }) });
        await robotsGet(request as never, { params: Promise.resolve({ domain }) });
        await pagesSitemapGet(request as never, { params: Promise.resolve({ domain }) });
        for (const locale of localeCodes) {
            const params = Promise.resolve({ domain, locale });
            await productsSitemapGet(request as never, { params });
            await collectionsSitemapGet(request as never, { params });
            await blogsSitemapGet(request as never, { params });
        }
    }

    // The seeding `mockLocalesApi()` probe above is not part of the cycle; everything else is.
    return mockFindAll.mock.calls.length + mockFindByDomain.mock.calls.length + mockPagesApi.mock.calls.length;
}

describe('SFREAD-13 build-time Convex call budget', () => {
    beforeEach(() => {
        for (const mock of [
            mockFindAll,
            mockFindByDomain,
            mockPagesApi,
            mockLocalesApi,
            mockLoaderBlogApi,
            mockProductHandlesApi,
            mockProductsPaginationApi,
            mockCollectionsApi,
            mockCollectionsPaginationApi,
            mockBlogsApi,
        ]) {
            mock.mockReset();
        }
    });

    it('keeps a full build + first-crawl cycle within the documented budget formula', async () => {
        const scenario: Scenario = { tenants: 4, blogsPerTenant: 2, localesPerTenant: 2, catalogSize: 3 };
        const calls = await runBuildCycle(scenario);
        const budget = maxConvexCallsPerBuild(scenario);

        expect(calls).toBeLessThanOrEqual(budget);
        // The formula is tight: the worst case (no render-pass dedup) lands exactly on it.
        expect(calls).toBe(budget);
        expect(budget).toBe(69);
    });

    it('issues a Convex call count independent of catalog size (M params never multiply calls)', async () => {
        const base: Scenario = { tenants: 3, blogsPerTenant: 1, localesPerTenant: 2, catalogSize: 3 };
        const smallCatalog = await runBuildCycle(base);

        for (const mock of [mockFindAll, mockFindByDomain, mockPagesApi]) {
            mock.mockClear();
        }
        const largeCatalog = await runBuildCycle({ ...base, catalogSize: 60 });

        expect(largeCatalog).toBe(smallCatalog);
        expect(largeCatalog).toBeLessThanOrEqual(maxConvexCallsPerBuild(base));
    });

    it('enumerates tenants from the single findAll batch — no per-shop findByDomain in the root warmer', async () => {
        seedPlatform({ tenants: 5, blogsPerTenant: 0, localesPerTenant: 1, catalogSize: 1 });

        const params = await rootStaticParams();

        expect(params).toHaveLength(5);
        expect(mockFindAll).toHaveBeenCalledTimes(1);
        expect(mockFindByDomain).not.toHaveBeenCalled();
    });

    it('filters demo shops from the findAll batch without extra lookups', async () => {
        mockFindAll.mockResolvedValue([
            { id: 's1', domain: 'live.example.com' },
            { id: 's2', domain: 'demo.example.com' },
        ]);

        const params = await rootStaticParams();

        expect(params).toEqual([{ domain: 'live.example.com', locale: 'en-US' }]);
        expect(mockFindByDomain).not.toHaveBeenCalled();
    });
});

describe('SFREAD-13 long-tail ISR posture', () => {
    /**
     * Recursively collects every page/route module under the app directory.
     *
     * @param directory - Absolute directory to walk.
     * @returns Absolute paths of all `page.tsx` / `route.ts(x)` files.
     */
    async function collectRouteModules(directory: string): Promise<string[]> {
        const entries = await readdir(directory, { withFileTypes: true });
        const files: string[] = [];
        for (const entry of entries) {
            const path = join(directory, entry.name);
            if (entry.isDirectory()) {
                files.push(...(await collectRouteModules(path)));
            } else if (/^(page\.tsx|route\.tsx?|layout\.tsx|static-params\.ts)$/.test(entry.name)) {
                files.push(path);
            }
        }
        return files;
    }

    it('no route segment disables dynamicParams — the long tail renders on first request', async () => {
        const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
        const modules = await collectRouteModules(appRoot);
        expect(modules.length).toBeGreaterThan(0);

        for (const path of modules) {
            const source = await readFile(path, 'utf8');
            // Next.js defaults `dynamicParams` to true; the budget relies on that default so
            // params outside the warm build set fall through to first-request ISR instead of
            // forcing exhaustive (unbounded) build-time enumeration.
            expect(source, `${path} must not disable dynamicParams`).not.toMatch(/dynamicParams\s*=/);
        }
    });
});
