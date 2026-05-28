import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// Faithful stand-in for React's RSC `cache()`: memoizes by Object.is per
// argument (a tree of Maps) — exactly the keying that defeats fresh
// object-literal args and rewards stable PRIMITIVE keys. Outside the
// react-server condition the real `cache()` is a transparent passthrough, so
// the dedup guarantee can only be asserted against a stand-in like this.
vi.mock('react', async (importActual) => {
    const actual = (await importActual()) as typeof import('react');
    return {
        ...actual,
        cache: <A extends unknown[], R>(fn: (...args: A) => R) => {
            const root = new Map<unknown, Map<unknown, unknown>>();
            const RESULT = Symbol('result');
            return (...args: A): R => {
                let node: Map<unknown, unknown> = root;
                for (const arg of args) {
                    let next = node.get(arg) as Map<unknown, unknown> | undefined;
                    if (!next) {
                        next = new Map();
                        node.set(arg, next);
                    }
                    node = next;
                }
                if (node.has(RESULT)) return node.get(RESULT) as R;
                const value = fn(...args);
                node.set(RESULT, value);
                return value;
            };
        },
    };
});

const ProductApiMock = vi.fn();
const ShopifyApolloApiClientMock = vi.fn();
const findByDomainMock = vi.fn();

vi.mock('@/api/_loaders', () => ({
    ProductApi: ProductApiMock,
    Shop: { findByDomain: findByDomainMock },
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApolloApiClient: ShopifyApolloApiClientMock,
}));

vi.mock('@/utils/locale', () => ({
    Locale: { from: (code: string) => ({ code, language: 'en', country: 'US' }) },
}));

describe('PDP fetch dedup', () => {
    beforeEach(() => {
        // Re-evaluate page-data so the cache()-wrapped loader gets a fresh memo
        // tree per test; clear the upstream spies so call counts are isolated.
        vi.resetModules();
        ProductApiMock.mockReset().mockResolvedValue([{ id: 'p1', handle: 'h1' }, null]);
        ShopifyApolloApiClientMock.mockReset().mockResolvedValue({ shop: () => ({}), locale: () => ({}) });
        findByDomainMock.mockReset().mockResolvedValue({ id: 's1', domain: 'shop.example.com' });
    });

    it('metadata + render share a single product fetch for the same (domain, locale, handle)', async () => {
        const { getPageProduct } = await import('./page-data');

        // Two concurrent calls — one standing in for generateMetadata, one for
        // the page render — with identical primitive keys.
        const [a, b] = await Promise.all([
            getPageProduct('shop.example.com', 'en-US', 'h1'),
            getPageProduct('shop.example.com', 'en-US', 'h1'),
        ]);

        expect(a).toEqual([{ id: 'p1', handle: 'h1' }, null]);
        expect(b).toEqual(a);
        // The whole resolve chain (tenant lookup → Apollo client → product query)
        // must run exactly once despite two callers.
        expect(findByDomainMock).toHaveBeenCalledTimes(1);
        expect(ShopifyApolloApiClientMock).toHaveBeenCalledTimes(1);
        expect(ProductApiMock).toHaveBeenCalledTimes(1);
    });

    it('routes the product query through the shared Apollo transport, never the fetch client', async () => {
        const { getPageProduct } = await import('./page-data');
        await getPageProduct('shop.example.com', 'en-US', 'h1');

        const apolloClient = await ShopifyApolloApiClientMock.mock.results[0]?.value;
        // ProductApi must receive the Apollo client built here — the same pooled
        // transport the page render uses — so both reads hit one InMemoryCache.
        expect(ProductApiMock).toHaveBeenCalledWith({ api: apolloClient, handle: 'h1' });
    });

    it('refetches for a different handle (distinct cache key)', async () => {
        const { getPageProduct } = await import('./page-data');

        await getPageProduct('shop.example.com', 'en-US', 'h1');
        await getPageProduct('shop.example.com', 'en-US', 'h2');

        expect(ProductApiMock).toHaveBeenCalledTimes(2);
    });
});
