import { createHmac } from 'node:crypto';
import { NotFoundError } from '@nordcom/commerce-errors';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as apolloPool from '@/api/_apollo-pool';

const revalidateTagMock = vi.fn();

vi.mock('next/cache', () => ({
    revalidateTag: revalidateTagMock,
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn().mockResolvedValue({ id: 'shop-1', domain: 'mock.shop' }),
        findAll: vi.fn(),
    },
}));

vi.mock('@/api/_apollo-pool', async () => {
    const actual = await vi.importActual<typeof apolloPool>('@/api/_apollo-pool');
    return { ...actual, evictApolloClient: vi.fn() };
});

const { POST, GET } = await import('@/app/[domain]/api/revalidate/route');

function makeRequest({
    method,
    body,
    headers,
}: {
    method: string;
    body: string;
    headers: Record<string, string>;
}): Request {
    return new Request('http://test.local/mock.shop/api/revalidate', {
        method,
        body,
        headers,
    });
}

describe('app/[domain]/api/revalidate', () => {
    const originalSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
    afterEach(() => {
        if (originalSecret === undefined) delete process.env.SHOPIFY_WEBHOOK_SECRET;
        else process.env.SHOPIFY_WEBHOOK_SECRET = originalSecret;
    });

    describe('POST — Shopify', () => {
        it('busts per-product tag on products/update with valid HMAC', async () => {
            revalidateTagMock.mockClear();
            const body = '{"handle":"my-product"}';
            const secret = 'shopify-secret';
            process.env.SHOPIFY_WEBHOOK_SECRET = secret;
            const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

            const req = makeRequest({
                method: 'POST',
                body,
                headers: {
                    'x-shopify-hmac-sha256': hmac,
                    'x-shopify-topic': 'products/update',
                    'content-type': 'application/json',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(200);
            expect(revalidateTagMock).toHaveBeenCalledWith('shopify.shop-1.product.my-product', 'max');
            // New behavior: tag set includes parents and tenant extras (schema fanout)
            expect(revalidateTagMock).toHaveBeenCalledWith('shopify.shop-1.products', 'max');
        });

        it('busts the products parent so cached search islands invalidate', async () => {
            revalidateTagMock.mockClear();
            const body = '{"handle":"my-product"}';
            const secret = 'shopify-secret';
            process.env.SHOPIFY_WEBHOOK_SECRET = secret;
            const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

            const req = makeRequest({
                method: 'POST',
                body,
                headers: {
                    'x-shopify-hmac-sha256': hmac,
                    'x-shopify-topic': 'products/update',
                    'content-type': 'application/json',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(200);

            // The 'products' parent tag invalidates every cached search entry for
            // this tenant because the search entity declares parents: ['products'].
            // This guarantees Shopify products/* webhooks bust cached search islands.
            const tagsBusted = revalidateTagMock.mock.calls.map((c) => c[0]);
            expect(tagsBusted).toContain('shopify.shop-1.products');
        });

        it('returns 401 on invalid HMAC', async () => {
            revalidateTagMock.mockClear();
            process.env.SHOPIFY_WEBHOOK_SECRET = 'shopify-secret';
            const req = makeRequest({
                method: 'POST',
                body: '{"handle":"my-product"}',
                headers: {
                    'x-shopify-hmac-sha256': 'wrong-hmac',
                    'x-shopify-topic': 'products/update',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(401);
            expect(revalidateTagMock).not.toHaveBeenCalled();
        });

        it('accepts when SHOPIFY_WEBHOOK_SECRET is missing (dev mode)', async () => {
            revalidateTagMock.mockClear();
            delete process.env.SHOPIFY_WEBHOOK_SECRET;
            const originalNodeEnv = process.env.NODE_ENV;
            // @ts-expect-error TS2540: NODE_ENV is read-only but we need to override it for testing
            process.env.NODE_ENV = 'development';
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

            const req = makeRequest({
                method: 'POST',
                body: '{"handle":"my-product"}',
                headers: {
                    'x-shopify-hmac-sha256': 'anything',
                    'x-shopify-topic': 'products/update',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(200);
            expect(warnSpy).toHaveBeenCalled();
            warnSpy.mockRestore();
            // @ts-expect-error TS2540: Restore NODE_ENV
            process.env.NODE_ENV = originalNodeEnv;
        });

        it('busts per-collection tag on collections/update with valid HMAC', async () => {
            revalidateTagMock.mockClear();
            const body = '{"handle":"summer-sale"}';
            const secret = 'shopify-secret';
            process.env.SHOPIFY_WEBHOOK_SECRET = secret;
            const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

            const req = makeRequest({
                method: 'POST',
                body,
                headers: {
                    'x-shopify-hmac-sha256': hmac,
                    'x-shopify-topic': 'collections/update',
                    'content-type': 'application/json',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(200);
            expect(revalidateTagMock).toHaveBeenCalledWith('shopify.shop-1.collection.summer-sale', 'max');
            // New behavior: tag set includes parents and tenant extras (schema fanout)
            expect(revalidateTagMock).toHaveBeenCalledWith('shopify.shop-1.collections', 'max');
        });

        it('falls back to broad sweep when handle is absent from body', async () => {
            revalidateTagMock.mockClear();
            const body = '{}';
            const secret = 'shopify-secret';
            process.env.SHOPIFY_WEBHOOK_SECRET = secret;
            const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

            const req = makeRequest({
                method: 'POST',
                body,
                headers: {
                    'x-shopify-hmac-sha256': hmac,
                    'x-shopify-topic': 'products/update',
                    'content-type': 'application/json',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(200);
            // Broad sweep invokes cache.invalidate.tenant which fires at least the tenant root tag
            expect(revalidateTagMock).toHaveBeenCalledWith('shopify.shop-1', 'max');
        });

        it('uses broad sweep when body is unparseable JSON', async () => {
            revalidateTagMock.mockClear();
            const body = 'not-json';
            const secret = 'shopify-secret';
            process.env.SHOPIFY_WEBHOOK_SECRET = secret;
            const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

            const req = makeRequest({
                method: 'POST',
                body,
                headers: {
                    'x-shopify-hmac-sha256': hmac,
                    'x-shopify-topic': 'products/update',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            // body parse fails — falls back to broad tag
            expect(res.status).toBe(200);
            expect(revalidateTagMock).toHaveBeenCalledWith('shopify.shop-1', 'max');
        });

        it('evicts the Apollo pool entry for the resolved shop', async () => {
            revalidateTagMock.mockClear();
            const { evictApolloClient } = await import('@/api/_apollo-pool');
            vi.mocked(evictApolloClient).mockClear();

            const body = '{"handle":"my-product"}';
            const secret = 'shopify-secret';
            process.env.SHOPIFY_WEBHOOK_SECRET = secret;
            const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

            const req = makeRequest({
                method: 'POST',
                body,
                headers: {
                    'x-shopify-hmac-sha256': hmac,
                    'x-shopify-topic': 'products/update',
                    'content-type': 'application/json',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(200);
            expect(vi.mocked(evictApolloClient)).toHaveBeenCalledWith({ shopId: 'shop-1' });
        });
    });

    describe('POST — unknown shape', () => {
        it('returns 400 when Shopify HMAC header is absent', async () => {
            revalidateTagMock.mockClear();
            const req = makeRequest({
                method: 'POST',
                body: '{"random":"payload"}',
                headers: { 'content-type': 'application/json' },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(400);
        });
    });

    describe('POST — shop not found', () => {
        it('returns 404 when Shop.findByDomain throws a NotFoundError', async () => {
            const { Shop } = await import('@nordcom/commerce-db');
            vi.mocked(Shop.findByDomain).mockRejectedValueOnce(new NotFoundError('unknown.shop'));

            const req = makeRequest({
                method: 'POST',
                body: '{}',
                headers: { 'content-type': 'application/json' },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'unknown.shop' }) } as any);
            expect(res.status).toBe(404);

            // restore default mock for subsequent tests
            vi.mocked(Shop.findByDomain).mockResolvedValue({ id: 'shop-1', domain: 'mock.shop' } as any);
        });

        it('returns 503 + Retry-After on non-NotFound infra errors from Shop.findByDomain', async () => {
            const { Shop } = await import('@nordcom/commerce-db');
            vi.mocked(Shop.findByDomain).mockRejectedValueOnce(new globalThis.Error('MongoNetworkTimeoutError'));

            const req = makeRequest({
                method: 'POST',
                body: '{}',
                headers: { 'content-type': 'application/json' },
            });

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            consoleSpy.mockRestore();

            expect(res.status).toBe(503);
            expect(res.headers.get('Retry-After')).toBe('30');

            // restore default mock for subsequent tests
            vi.mocked(Shop.findByDomain).mockResolvedValue({ id: 'shop-1', domain: 'mock.shop' } as any);
        });
    });

    describe('POST — shop-domain pinning', () => {
        it('returns 401 when x-shopify-shop-domain does not match the shop on file', async () => {
            revalidateTagMock.mockClear();
            const body = '{"handle":"my-product"}';
            const secret = 'shopify-secret';
            process.env.SHOPIFY_WEBHOOK_SECRET = secret;
            const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

            // The DB says this tenant's Shopify domain is store-a.myshopify.com
            const { Shop } = await import('@nordcom/commerce-db');
            vi.mocked(Shop.findByDomain).mockResolvedValueOnce({
                id: 'shop-1',
                domain: 'mock.shop',
                commerceProvider: { authentication: { domain: 'store-a.myshopify.com' } },
            } as any);

            const req = makeRequest({
                method: 'POST',
                body,
                headers: {
                    'x-shopify-hmac-sha256': hmac,
                    'x-shopify-topic': 'products/update',
                    'x-shopify-shop-domain': 'store-b.myshopify.com', // different store
                    'content-type': 'application/json',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(401);
            const json = await res.json();
            expect(json.error).toBe('shop-domain mismatch');
            expect(revalidateTagMock).not.toHaveBeenCalled();
        });

        it('passes through when x-shopify-shop-domain matches the shop on file', async () => {
            revalidateTagMock.mockClear();
            const body = '{"handle":"my-product"}';
            const secret = 'shopify-secret';
            process.env.SHOPIFY_WEBHOOK_SECRET = secret;
            const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

            const { Shop } = await import('@nordcom/commerce-db');
            vi.mocked(Shop.findByDomain).mockResolvedValueOnce({
                id: 'shop-1',
                domain: 'mock.shop',
                commerceProvider: { authentication: { domain: 'store-a.myshopify.com' } },
            } as any);

            const req = makeRequest({
                method: 'POST',
                body,
                headers: {
                    'x-shopify-hmac-sha256': hmac,
                    'x-shopify-topic': 'products/update',
                    'x-shopify-shop-domain': 'store-a.myshopify.com',
                    'content-type': 'application/json',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(200);
            expect(revalidateTagMock).toHaveBeenCalled();
        });
    });

    describe('GET', () => {
        it('returns 200 empty for liveness pings', async () => {
            const res = await GET();
            expect(res.status).toBe(200);
        });
    });
});

describe('POST — round trip with loader tag scheme', () => {
    it('revalidates exactly the tags that ProductApi would write for the same product', async () => {
        revalidateTagMock.mockClear();
        const body = '{"handle":"red-widget"}';
        const secret = 'shopify-secret';
        process.env.SHOPIFY_WEBHOOK_SECRET = secret;
        const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

        const req = makeRequest({
            method: 'POST',
            body,
            headers: {
                'x-shopify-hmac-sha256': hmac,
                'x-shopify-topic': 'products/update',
                'content-type': 'application/json',
            },
        });

        const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
        expect(res.status).toBe(200);

        // Compute the tags the loader writes for shop-1 + product handle red-widget.
        // No locale qualifier — Shopify webhook tags don't include locale, and
        // neither does the loader's .tags array; locale only appears in readTag.
        const { cache: shopifyCache } = await import('@/cache');
        const loaderKey = shopifyCache.keys.product({
            tenant: { id: 'shop-1', domain: 'mock.shop' } as any,
            handle: 'red-widget',
        });

        // Every tag the loader writes must appear in revalidateTag invocations.
        for (const tag of loaderKey.tags) {
            expect(revalidateTagMock).toHaveBeenCalledWith(tag, 'max');
        }
    });

    it('revalidates exactly the tags that CollectionApi would write for the same collection', async () => {
        revalidateTagMock.mockClear();
        const body = '{"handle":"summer-sale"}';
        const secret = 'shopify-secret';
        process.env.SHOPIFY_WEBHOOK_SECRET = secret;
        const hmac = createHmac('sha256', secret).update(body, 'utf8').digest('base64');

        const req = makeRequest({
            method: 'POST',
            body,
            headers: {
                'x-shopify-hmac-sha256': hmac,
                'x-shopify-topic': 'collections/update',
                'content-type': 'application/json',
            },
        });

        const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
        expect(res.status).toBe(200);

        // Compute the tags the loader writes for shop-1 + collection handle summer-sale.
        // No locale qualifier — Shopify webhook tags don't include locale, and
        // neither does the loader's .tags array; locale only appears in readTag.
        const { cache: shopifyCache } = await import('@/cache');
        const loaderKey = shopifyCache.keys.collection({
            tenant: { id: 'shop-1', domain: 'mock.shop' } as any,
            handle: 'summer-sale',
        });

        // Every tag the loader writes must appear in revalidateTag invocations.
        for (const tag of loaderKey.tags) {
            expect(revalidateTagMock).toHaveBeenCalledWith(tag, 'max');
        }
    });
});
