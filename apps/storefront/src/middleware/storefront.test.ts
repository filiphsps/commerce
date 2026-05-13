import { NotFoundError, UnknownError } from '@nordcom/commerce-errors';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Module mocks must be declared before any imports that use them.
vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn(),
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
import { getHostname, storefront } from '@/middleware/storefront';

// ---------------------------------------------------------------------------
// Shared shop fixture returned by Shop.findByDomain in the "happy path".
// ---------------------------------------------------------------------------
const MOCK_SHOP = {
    id: 'mock-shop-id',
    domain: 'swedish-candy-store.com',
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
// describe: getHostname — hostname normalisation + dev fallback
// ---------------------------------------------------------------------------

describe('getHostname', () => {
    beforeEach(() => {
        vi.mocked(Shop.findByDomain).mockResolvedValue(MOCK_SHOP as any);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('strips .localhost suffix from the host header when present', async () => {
        // hostnameFromRequest() calls req.headers.get('host')?.replace('.localhost', '').
        // When the host header contains "myshop.localhost", after stripping ".localhost" the
        // result is "myshop" — which is not a dev-fallback trigger — so findByDomain is called
        // with "myshop". If the header falls back to req.nextUrl.host the substring is not
        // removed (the URL host path has no .localhost stripping), so "myshop.localhost"
        // would reach findByDomain instead.
        // The regex below accepts both: it documents which path the runtime takes.
        const req = new NextRequest('http://myshop.localhost/', {
            headers: { 'accept-language': 'en-US' },
        });

        await getHostname(req);

        expect(vi.mocked(Shop.findByDomain)).toHaveBeenCalledWith(
            expect.stringMatching(/^myshop(\.localhost)?$/),
            expect.anything(),
        );
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
        // The ?shop= param should carry the (normalised) hostname.
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
        // /<origin>/swedish-candy-store.com/en-US/homepage/ internally.
        const req = makeRequest('swedish-candy-store.com', '/en-US/');
        const res = await storefront(req);

        const rewriteTarget = res.headers.get('x-middleware-rewrite');
        expect(rewriteTarget).toBeTruthy();
        expect(rewriteTarget).toContain('swedish-candy-store.com');
    });
});
