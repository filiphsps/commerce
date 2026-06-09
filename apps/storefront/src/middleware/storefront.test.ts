import { NotFoundError, UnknownError } from '@nordcom/commerce-errors';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Module mocks must be declared before any imports that use them.
vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn(),
        findAll: vi.fn().mockResolvedValue([]),
    },
}));

vi.mock('@/api/shop', () => ({
    getGlobalServiceDomain: vi.fn().mockReturnValue('shops.nordcom.io'),
}));

vi.mock('@/api/shopify', () => ({
    ShopifyApiClient: vi.fn().mockResolvedValue({}),
    ShopifyApolloApiClient: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/api/store', () => ({
    LocalesApi: vi.fn().mockResolvedValue([{ code: 'en-US' }]),
}));

// commonValidations does path manipulation — use the real implementation so the
// middleware chain doesn't fail on missing internals.
vi.mock('@/middleware/common-validations', async (importActual) => importActual());

// Import after vi.mock declarations so the mocked modules are resolved first.
import { Shop } from '@nordcom/commerce-db';
import { getGlobalServiceDomain } from '@/api/shop';
import { LocalesApi } from '@/api/store';
import { clearShopCache } from '@/middleware/shop-cache';
import { getHostname, resetShopResolutionTracking, storefront } from '@/middleware/storefront';

// The middleware memoizes hostname resolution in a process-level cache (plus a
// change-tracking map for invalidation). Reset both before every test so cases
// that reuse a hostname still exercise the (mocked) lookup instead of serving
// a sibling test's cached result.
beforeEach(() => {
    clearShopCache();
    resetShopResolutionTracking();
});

// ---------------------------------------------------------------------------
// Shared shop fixture returned by Shop.findByDomain in the "happy path".
// ---------------------------------------------------------------------------
const MOCK_SHOP = {
    id: 'mock-shop-id',
    domain: 'nordcom-demo-shop.com',
    commerceProvider: {
        type: 'shopify' as const,
        domain: 'mock.myshopify.com',
        authentication: {
            publicToken: 'pub-token',
            token: 'priv-token',
        },
    },
    contentProvider: { type: 'cms' as const },
    i18n: { defaultLocale: 'en-US' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a NextRequest with the given host header and path. */
function makeRequest(host: string, path = '/'): NextRequest {
    return new NextRequest(`http://${host}${path}`, {
        headers: { host, 'accept-language': 'en-US,en;q=0.9' },
    });
}

// ---------------------------------------------------------------------------
// describe: getHostname — hostname normalization + dev fallback
// ---------------------------------------------------------------------------

describe('getHostname', () => {
    beforeEach(() => {
        vi.mocked(Shop.findByDomain).mockResolvedValue(MOCK_SHOP as any);
        vi.mocked(Shop.findAll).mockResolvedValue([]);
    });

    afterEach(() => {
        vi.clearAllMocks();
        delete process.env.STOREFRONT_DEV_SHOP;
    });

    it('routes <shop>.storefront.localhost host headers to STOREFRONT_DEV_SHOP', async () => {
        // Dev routing pins .storefront.localhost requests to a single configured
        // shop (so the dev proxy can serve one tenant regardless of subdomain).
        // The .storefront.localhost subdomain is intentionally ignored here.
        process.env.STOREFRONT_DEV_SHOP = 'dev-shop.example.com';

        const req = new NextRequest('http://myshop.storefront.localhost/', {
            headers: { host: 'myshop.storefront.localhost', 'accept-language': 'en-US' },
        });

        await getHostname(req);

        expect(vi.mocked(Shop.findByDomain)).toHaveBeenCalledWith('dev-shop.example.com', expect.anything());
    });

    it('falls back to the first seeded shop for .storefront.localhost when STOREFRONT_DEV_SHOP is unset', async () => {
        delete process.env.STOREFRONT_DEV_SHOP;
        vi.mocked(Shop.findAll).mockResolvedValue([{ domain: 'seeded-shop.example.com' } as any]);

        const req = new NextRequest('http://myshop.storefront.localhost/', {
            headers: { host: 'myshop.storefront.localhost', 'accept-language': 'en-US' },
        });

        await getHostname(req);

        // The middleware ignores the subdomain and resolves to the first shop
        // the Convex-backed Shop service returns — i.e. whatever the dev seed
        // inserted. Guard against regressing back to slug extraction or the
        // previous hard-coded fallback.
        const calledWith = vi.mocked(Shop.findByDomain).mock.calls[0]?.[0];
        expect(calledWith).toBe('seeded-shop.example.com');
    });

    it('uses full hostname for production-style hosts', async () => {
        const req = new NextRequest('http://myshop.com/', {
            headers: { host: 'myshop.com', 'accept-language': 'en-US' },
        });

        await getHostname(req);

        expect(vi.mocked(Shop.findByDomain)).toHaveBeenCalledWith('myshop.com', expect.anything());
    });

    it('falls back to req.nextUrl.host when the host header is absent', async () => {
        // No `host` header set — req.headers.get('host') returns null,
        // so the resolver falls back to req.nextUrl.host.
        const req = new NextRequest('http://myshop.com/');

        await getHostname(req);

        expect(vi.mocked(Shop.findByDomain)).toHaveBeenCalledWith('myshop.com', expect.anything());
    });

    it('strips port from the hostname before lookup', async () => {
        const req = new NextRequest('http://myshop.com:3000/', {
            headers: { host: 'myshop.com:3000', 'accept-language': 'en-US' },
        });

        await getHostname(req);

        expect(vi.mocked(Shop.findByDomain)).toHaveBeenCalledWith('myshop.com', expect.anything());
    });

    it('returns the domain from the Shop record', async () => {
        vi.mocked(Shop.findByDomain).mockResolvedValueOnce({ ...MOCK_SHOP, domain: 'example.com' } as any);

        const req = makeRequest('example.com');
        const domain = await getHostname(req);

        expect(domain).toBe('example.com');
    });

    it('throws NotFoundError when findByDomain returns a record without a domain', async () => {
        vi.mocked(Shop.findByDomain).mockResolvedValueOnce({ ...MOCK_SHOP, domain: undefined } as any);

        const req = makeRequest('no-domain.com');
        // ESM class identity can diverge across module instances, so check name
        // rather than instanceof to avoid false negatives in the test runner.
        await expect(getHostname(req)).rejects.toMatchObject({ name: 'NotFoundError' });
    });
});

// ---------------------------------------------------------------------------
// describe: storefront — error-rewrite paths
// ---------------------------------------------------------------------------

describe('storefront middleware — error rewrites', () => {
    beforeEach(() => {
        vi.mocked(getGlobalServiceDomain).mockReturnValue('shops.nordcom.io');
        // Default: successful shop lookup so the middleware runs the happy path.
        vi.mocked(Shop.findByDomain).mockResolvedValue(MOCK_SHOP as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
        delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    });

    it('rewrites to /status/unknown-shop/ when Shop.findByDomain throws NotFoundError', async () => {
        vi.mocked(Shop.findByDomain).mockRejectedValue(new NotFoundError('shop'));

        const req = makeRequest('unknown.com', '/en-US/');
        const res = await storefront(req);

        const rewriteTarget = res.headers.get('x-middleware-rewrite');
        expect(rewriteTarget).toBeTruthy();
        expect(rewriteTarget).toContain('/status/unknown-shop/');
        expect(rewriteTarget).toContain('shops.nordcom.io');
    });

    it('rewrites to /status/unknown-error/ for non-NotFound commerce errors', async () => {
        vi.mocked(Shop.findByDomain).mockRejectedValue(new UnknownError('something went wrong'));

        const req = makeRequest('broken.com', '/en-US/');
        const res = await storefront(req);

        const rewriteTarget = res.headers.get('x-middleware-rewrite');
        expect(rewriteTarget).toBeTruthy();
        expect(rewriteTarget).toContain('/status/unknown-error/');
        expect(rewriteTarget).toContain('shops.nordcom.io');
    });

    it('forwards VERCEL_AUTOMATION_BYPASS_SECRET as x-vercel-protection-bypass on error rewrite', async () => {
        process.env.VERCEL_AUTOMATION_BYPASS_SECRET = 'bypass-token-abc';
        vi.mocked(Shop.findByDomain).mockRejectedValue(new NotFoundError('shop'));

        // Spy on NextResponse.rewrite so we can inspect the headers passed into the
        // rewrite request — the bypass header is set on the *inbound* request, not
        // the outbound response, so x-middleware-rewrite alone cannot verify it.
        const { NextResponse } = await import('next/server');
        const rewriteSpy = vi.spyOn(NextResponse, 'rewrite');

        const req = makeRequest('unknown.com', '/en-US/');
        await storefront(req);

        expect(rewriteSpy).toHaveBeenCalled();
        const [, options] = rewriteSpy.mock.calls[0]!;
        const forwardedHeaders = (options as any)?.request?.headers as Headers | undefined;
        expect(forwardedHeaders?.get('x-vercel-protection-bypass')).toBe('bypass-token-abc');

        rewriteSpy.mockRestore();
    });

    it('includes the original shop hostname as a query param on error rewrites', async () => {
        vi.mocked(Shop.findByDomain).mockRejectedValue(new NotFoundError('shop'));

        const req = makeRequest('myshop.com', '/en-US/');
        const res = await storefront(req);

        const rewriteTarget = res.headers.get('x-middleware-rewrite');
        expect(rewriteTarget).toBeTruthy();
        // The ?shop= param should carry the (normalized) hostname.
        expect(rewriteTarget).toContain('shop=myshop.com');
    });
});

// ---------------------------------------------------------------------------
// describe: storefront — happy path (domain injected into rewrite)
// ---------------------------------------------------------------------------

describe('storefront middleware — happy path rewrite', () => {
    beforeEach(() => {
        vi.mocked(getGlobalServiceDomain).mockReturnValue('shops.nordcom.io');
        vi.mocked(Shop.findByDomain).mockResolvedValue(MOCK_SHOP as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('rewrites a resolved request to include the shop domain in the target path', async () => {
        // Request arrives at /en-US/ — the middleware should rewrite to
        // /<origin>/nordcom-demo-shop.com/en-US/homepage/ internally.
        const req = makeRequest('nordcom-demo-shop.com', '/en-US/');
        const res = await storefront(req);

        const rewriteTarget = res.headers.get('x-middleware-rewrite');
        expect(rewriteTarget).toBeTruthy();
        expect(rewriteTarget).toContain('nordcom-demo-shop.com');
    });
});

// ---------------------------------------------------------------------------
// describe: storefront — cache contract over the Convex seam (SFREAD-04)
// ---------------------------------------------------------------------------

describe('storefront middleware — shop-cache contract', () => {
    beforeEach(() => {
        vi.mocked(getGlobalServiceDomain).mockReturnValue('shops.nordcom.io');
        vi.mocked(Shop.findByDomain).mockResolvedValue(MOCK_SHOP as any);
        vi.mocked(LocalesApi).mockResolvedValue([{ code: 'en-US' }] as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('serves repeat requests for a hostname from the cache with zero network calls', async () => {
        // Cookie-less request to `/` exercises BOTH cached views: the summary
        // (existence + default locale) and the locale-code list.
        await storefront(makeRequest('nordcom-demo-shop.com', '/'));
        expect(vi.mocked(Shop.findByDomain)).toHaveBeenCalled();
        expect(vi.mocked(LocalesApi)).toHaveBeenCalledTimes(1);

        // The Convex seam (ConvexHttpClient) and the Shopify locale round-trip
        // both ride on `fetch`; a warm cache hit must reach NEITHER the mocked
        // service seam NOR the network at all.
        vi.mocked(Shop.findByDomain).mockClear();
        vi.mocked(LocalesApi).mockClear();
        const fetchSpy = vi.spyOn(globalThis, 'fetch');

        try {
            await storefront(makeRequest('nordcom-demo-shop.com', '/'));

            expect(vi.mocked(Shop.findByDomain)).not.toHaveBeenCalled();
            expect(vi.mocked(LocalesApi)).not.toHaveBeenCalled();
            expect(fetchSpy).not.toHaveBeenCalled();
        } finally {
            fetchSpy.mockRestore();
        }
    });

    it('invalidates the cached locale list when a reload reveals a default-locale change', async () => {
        // The canonical domain must match the request host: the middleware
        // re-keys the post-getHostname resolutions on the canonical domain, so
        // a mismatched fixture would spread the two cached views across two
        // keys and never hit the change-detection path under test.
        const localeShop = { ...MOCK_SHOP, domain: 'locale-change.example.com' };
        vi.mocked(Shop.findByDomain).mockResolvedValue(localeShop as any);

        // Only fake `Date` — the TTL cache gates purely on `Date.now()`, and
        // faking timers wholesale would stall unrelated async machinery.
        vi.useFakeTimers({ toFake: ['Date'] });
        try {
            vi.setSystemTime(new Date('2026-06-09T12:00:00Z'));
            await storefront(makeRequest('locale-change.example.com', '/'));
            expect(vi.mocked(LocalesApi)).toHaveBeenCalledTimes(1);

            // 61 s later the summary TTL (60 s) has lapsed while the locale
            // list TTL (300 s) has not — without explicit invalidation the
            // stale locale set would keep being served from its own entry.
            vi.setSystemTime(new Date('2026-06-09T12:01:01Z'));
            vi.mocked(Shop.findByDomain).mockResolvedValue({
                ...localeShop,
                i18n: { defaultLocale: 'de-DE' },
            } as any);

            await storefront(makeRequest('locale-change.example.com', '/'));

            // The summary reload observed the locale change and invalidated
            // both views, so the locale list refetches within this request.
            expect(vi.mocked(LocalesApi)).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });
});
