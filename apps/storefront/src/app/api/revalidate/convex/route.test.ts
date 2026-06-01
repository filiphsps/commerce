import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalizeRevalidatePayload, type RevalidateEventPayload } from '@/api/_revalidate-convex';

// The Convex bridge route inverts the Shopify revalidate ordering: it verifies
// the HMAC FIRST, before any tenant resolution or cache work. These tests pin
// that property — a bad/missing signature must reach ZERO cache or Apollo-pool
// side effects — plus the cache-tail behavior reused from the Shopify route.

const invalidateRawMock = vi.fn();
const invalidateTenantMock = vi.fn();
const evictApolloClientMock = vi.fn();

vi.mock('@/cache', () => ({
    cache: {
        invalidateRaw: invalidateRawMock,
        invalidate: { tenant: invalidateTenantMock },
    },
}));

vi.mock('@/api/_apollo-pool', () => ({
    evictApolloClient: evictApolloClientMock,
}));

const { POST, GET } = await import('@/app/api/revalidate/convex/route');

const CURRENT = 'convex-current-secret';
const PREVIOUS = 'convex-previous-secret';
const HMAC_HEADER = 'x-convex-hmac-sha256';

/**
 * Computes the base64 HMAC-SHA256 of a body with a secret — mirrors the signing
 * the Convex side performs so tests sign exactly as production would.
 *
 * @param body - Raw request body to sign.
 * @param secret - HMAC key.
 * @returns Base64-encoded signature.
 */
function sign(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body, 'utf8').digest('base64');
}

/**
 * Builds a fresh, valid revalidation payload, defaulting `ts` to now so the
 * staleness guard treats it as in-window.
 *
 * @param overrides - Partial fields to override on the default payload.
 * @returns A complete {@link RevalidateEventPayload}.
 */
function makePayload(overrides: Partial<RevalidateEventPayload> = {}): RevalidateEventPayload {
    return {
        eventId: 'evt_1',
        tenantId: 'tenant_1',
        legacyShopId: 'shop-1',
        collection: 'products',
        tags: ['shopify.shop-1.product.red-widget', 'shopify.shop-1.products'],
        ts: Date.now(),
        ...overrides,
    };
}

/**
 * Constructs a POST `Request` for the Convex revalidate route.
 *
 * @param body - Raw request body.
 * @param signature - Value for the HMAC header; omit to send no signature.
 * @returns A `Request` targeting the route.
 */
function makeRequest(body: string, signature?: string): Request {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (signature !== undefined) headers[HMAC_HEADER] = signature;
    return new Request('http://test.local/api/revalidate/convex', { method: 'POST', body, headers });
}

describe('app/api/revalidate/convex', () => {
    const originalSecret = process.env.CONVEX_REVALIDATE_SECRET;
    const originalPrevious = process.env.CONVEX_REVALIDATE_SECRET_PREVIOUS;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CONVEX_REVALIDATE_SECRET = CURRENT;
        delete process.env.CONVEX_REVALIDATE_SECRET_PREVIOUS;
    });

    afterEach(() => {
        if (originalSecret === undefined) delete process.env.CONVEX_REVALIDATE_SECRET;
        else process.env.CONVEX_REVALIDATE_SECRET = originalSecret;
        if (originalPrevious === undefined) delete process.env.CONVEX_REVALIDATE_SECRET_PREVIOUS;
        else process.env.CONVEX_REVALIDATE_SECRET_PREVIOUS = originalPrevious;
    });

    describe('verify-before-lookup (security)', () => {
        it('returns 401 on an invalid signature WITHOUT touching the cache or Apollo pool', async () => {
            const body = canonicalizeRevalidatePayload(makePayload());

            const res = await POST(makeRequest(body, 'wrong-signature'));

            expect(res.status).toBe(401);
            // The key property: verification happens before any side-effecting work.
            expect(invalidateRawMock).not.toHaveBeenCalled();
            expect(invalidateTenantMock).not.toHaveBeenCalled();
            expect(evictApolloClientMock).not.toHaveBeenCalled();
        });

        it('returns 401 when the signature header is absent WITHOUT any cache work', async () => {
            const body = canonicalizeRevalidatePayload(makePayload());

            const res = await POST(makeRequest(body));

            expect(res.status).toBe(401);
            expect(invalidateRawMock).not.toHaveBeenCalled();
            expect(invalidateTenantMock).not.toHaveBeenCalled();
            expect(evictApolloClientMock).not.toHaveBeenCalled();
        });
    });

    describe('valid signature — cache tail', () => {
        it('invalidates the supplied tags and evicts the Apollo pool for the body shopId', async () => {
            const payload = makePayload();
            const body = canonicalizeRevalidatePayload(payload);

            const res = await POST(makeRequest(body, sign(body, CURRENT)));

            expect(res.status).toBe(200);
            expect(invalidateRawMock).toHaveBeenCalledWith(payload.tags);
            expect(evictApolloClientMock).toHaveBeenCalledWith({ shopId: 'shop-1' });
            expect(invalidateTenantMock).not.toHaveBeenCalled();
        });

        it('triggers the tenant broad-sweep when tags are empty', async () => {
            const payload = makePayload({ tags: [] });
            const body = canonicalizeRevalidatePayload(payload);

            const res = await POST(makeRequest(body, sign(body, CURRENT)));

            expect(res.status).toBe(200);
            expect(await res.json()).toMatchObject({ tags: 'broad-sweep' });
            expect(invalidateTenantMock).toHaveBeenCalledWith({ id: 'shop-1' });
            expect(evictApolloClientMock).toHaveBeenCalledWith({ shopId: 'shop-1' });
            expect(invalidateRawMock).not.toHaveBeenCalled();
        });

        it('accepts a signature made with the previous secret during rotation', async () => {
            process.env.CONVEX_REVALIDATE_SECRET_PREVIOUS = PREVIOUS;
            const payload = makePayload();
            const body = canonicalizeRevalidatePayload(payload);

            const res = await POST(makeRequest(body, sign(body, PREVIOUS)));

            expect(res.status).toBe(200);
            expect(invalidateRawMock).toHaveBeenCalledWith(payload.tags);
        });

        it('rejects a previous-secret signature once the rotation window is closed (_PREVIOUS unset)', async () => {
            // beforeEach leaves _PREVIOUS unset; closing the window must drop the
            // dual-accept fallback so an old-secret delivery no longer verifies.
            const payload = makePayload();
            const body = canonicalizeRevalidatePayload(payload);

            const res = await POST(makeRequest(body, sign(body, PREVIOUS)));

            expect(res.status).toBe(401);
            expect(invalidateRawMock).not.toHaveBeenCalled();
            expect(invalidateTenantMock).not.toHaveBeenCalled();
            expect(evictApolloClientMock).not.toHaveBeenCalled();
        });

        it('always accepts a current-secret signature regardless of the rotation window', async () => {
            const payload = makePayload();
            const body = canonicalizeRevalidatePayload(payload);

            const closed = await POST(makeRequest(body, sign(body, CURRENT)));
            expect(closed.status).toBe(200);

            process.env.CONVEX_REVALIDATE_SECRET_PREVIOUS = PREVIOUS;
            const open = await POST(makeRequest(body, sign(body, CURRENT)));
            expect(open.status).toBe(200);
        });
    });

    describe('malformed input (valid signature)', () => {
        it('returns 400 when the body is unparseable JSON', async () => {
            const body = 'not-json';

            const res = await POST(makeRequest(body, sign(body, CURRENT)));

            expect(res.status).toBe(400);
            expect(invalidateRawMock).not.toHaveBeenCalled();
            expect(invalidateTenantMock).not.toHaveBeenCalled();
        });

        it('returns 400 when the body parses but has the wrong shape', async () => {
            const body = JSON.stringify({ hello: 'world' });

            const res = await POST(makeRequest(body, sign(body, CURRENT)));

            expect(res.status).toBe(400);
            expect(invalidateRawMock).not.toHaveBeenCalled();
            expect(invalidateTenantMock).not.toHaveBeenCalled();
        });
    });

    describe('staleness / replay guard', () => {
        it('acknowledges (200) but skips work for an out-of-window event', async () => {
            const payload = makePayload({ ts: Date.now() - 10 * 60 * 1000 });
            const body = canonicalizeRevalidatePayload(payload);

            const res = await POST(makeRequest(body, sign(body, CURRENT)));

            expect(res.status).toBe(200);
            expect(await res.json()).toMatchObject({ skipped: 'stale' });
            expect(invalidateRawMock).not.toHaveBeenCalled();
            expect(invalidateTenantMock).not.toHaveBeenCalled();
            expect(evictApolloClientMock).not.toHaveBeenCalled();
        });
    });

    describe('infrastructure failures', () => {
        it('returns 503 + Retry-After when cache invalidation throws', async () => {
            invalidateRawMock.mockRejectedValueOnce(new globalThis.Error('redis down'));
            const payload = makePayload();
            const body = canonicalizeRevalidatePayload(payload);

            const res = await POST(makeRequest(body, sign(body, CURRENT)));

            expect(res.status).toBe(503);
            expect(res.headers.get('Retry-After')).toBe('30');
        });

        it('returns 503 + Retry-After when the signing secret is not configured', async () => {
            delete process.env.CONVEX_REVALIDATE_SECRET;
            const payload = makePayload();
            const body = canonicalizeRevalidatePayload(payload);

            const res = await POST(makeRequest(body, sign(body, CURRENT)));

            expect(res.status).toBe(503);
            expect(res.headers.get('Retry-After')).toBe('30');
            expect(invalidateRawMock).not.toHaveBeenCalled();
        });
    });

    describe('GET', () => {
        it('returns 200 for liveness pings', async () => {
            const res = await GET();
            expect(res.status).toBe(200);
        });
    });
});
