import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

const revalidateTagMock = vi.fn();

vi.mock('next/cache', () => ({
    revalidateTag: revalidateTagMock,
}));

vi.mock('@nordcom/commerce-db', () => ({
    Shop: {
        findByDomain: vi.fn().mockResolvedValue({ id: 'shop-1', domain: 'mock.shop' }),
    },
}));

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

        it('accepts when SHOPIFY_WEBHOOK_SECRET is missing in dev', async () => {
            revalidateTagMock.mockClear();
            delete process.env.SHOPIFY_WEBHOOK_SECRET;
            // Force the dev branch — outside of NODE_ENV=development the
            // route now hard-fails with 503 instead of accepting unsigned
            // webhooks.
            const originalNodeEnv = process.env.NODE_ENV;
            (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
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
            (process.env as { NODE_ENV?: string }).NODE_ENV = originalNodeEnv;
        });

        it('refuses with 503 when SHOPIFY_WEBHOOK_SECRET is missing outside dev', async () => {
            revalidateTagMock.mockClear();
            delete process.env.SHOPIFY_WEBHOOK_SECRET;
            const originalNodeEnv = process.env.NODE_ENV;
            (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';

            const req = makeRequest({
                method: 'POST',
                body: '{"handle":"my-product"}',
                headers: {
                    'x-shopify-hmac-sha256': 'anything',
                    'x-shopify-topic': 'products/update',
                },
            });

            const res = await POST(req as any, { params: Promise.resolve({ domain: 'mock.shop' }) } as any);
            expect(res.status).toBe(503);
            expect(revalidateTagMock).not.toHaveBeenCalled();
            (process.env as { NODE_ENV?: string }).NODE_ENV = originalNodeEnv;
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
        });

        it('busts list + broad sweep when handle is absent from body', async () => {
            // The webhook now also emits the plural list-tag for products/*
            // and collections/*, so a handle-less webhook body still
            // refreshes list pages.
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
            expect(revalidateTagMock).toHaveBeenCalledWith('shopify.shop-1.products', 'max');
            expect(revalidateTagMock).toHaveBeenCalledWith('shopify.shop-1', 'max');
            expect(revalidateTagMock).toHaveBeenCalledTimes(2);
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
        it('returns 404 when Shop.findByDomain throws', async () => {
            const { Shop } = await import('@nordcom/commerce-db');
            vi.mocked(Shop.findByDomain).mockRejectedValueOnce(new Error('not found'));

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
    });

    describe('GET', () => {
        it('returns 200 empty for liveness pings', async () => {
            const res = await GET();
            expect(res.status).toBe(200);
        });
    });
});
