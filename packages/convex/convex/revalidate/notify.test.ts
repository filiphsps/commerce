import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { ConvexError } from 'convex/values';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Id } from '../_generated/dataModel';
import schema from '../schema';

const notifyRef = makeFunctionReference<'action'>('revalidate/notify:notify');

/**
 * Module map for `convex-test`. The real `revalidate/notify` module is mapped so the action and its
 * `loadDelivery`/`ackDelivery` helpers resolve by `FunctionReference`; the dummy `_generated` key only
 * anchors convex-test's shared `/convex/` module-root detection (see `revalidate/idempotency.test.ts`).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/revalidate/notify.ts': () => import('./notify'),
};

const SECRET = 'convex-current-secret';

/**
 * Independently recomputes the base64 HMAC-SHA256 a valid signature must equal — the exact value the
 * Next verifier (`verifyRevalidateHmac`, BRIDGE-01) compares against. Computed straight from the Web
 * Crypto primitive in the test (not via the production signer), so a string equality proves the signed
 * body round-trips against the verifier's algorithm and secret.
 *
 * @param body - The exact request body that was signed.
 * @param secret - The signing secret.
 * @returns The expected base64 signature.
 */
async function expectedSignature(body: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
    ]);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    let binary = '';
    for (const byte of new Uint8Array(signature)) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

/**
 * Seeds a shop and a pending coalescing row, returning the pending row id the action delivers against.
 *
 * @param t - The convex-test harness.
 * @param shop - The shop's primary `domain` and optional platform `alternativeDomains`.
 * @returns The seeded `pendingRevalidations` row id.
 */
async function seedDelivery(
    t: ReturnType<typeof convexTest>,
    shop: { domain: string; alternativeDomains?: string[] }
): Promise<Id<'pendingRevalidations'>> {
    return t.run(async (ctx) => {
        await ctx.db.insert('shops', {
            legacyId: 'legacy-shop-1',
            name: 'Demo Shop',
            domain: shop.domain,
            alternativeDomains: shop.alternativeDomains,
            design: {
                header: { logo: { width: 1, height: 1, src: 'https://example.com/logo.png', alt: 'logo' } },
                accents: [],
            },
            commerceProvider: {
                type: 'shopify',
                authentication: { publicToken: 'public-token' },
                storefrontId: 'sf-1',
                domain: 'mock.shop',
                id: 'shop-1',
            },
            createdAt: 0,
            updatedAt: 0,
        });
        return ctx.db.insert('pendingRevalidations', {
            tenantId: 'legacy-shop-1',
            collection: 'pages',
            tags: ['cms.legacy-shop-1.pages.about', 'cms.legacy-shop-1.pages'],
        });
    });
}

describe('notify (Convex→Next revalidation delivery)', () => {
    beforeEach(() => {
        vi.stubEnv('CONVEX_REVALIDATE_SECRET', SECRET);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('signs the canonical body with the current secret and POSTs to the custom-domain storefront, then acks', async () => {
        const t = convexTest(schema, modules);
        const pendingId = await seedDelivery(t, {
            domain: 'custom-shop.example.com',
            alternativeDomains: ['legacy-shop.nordcom.shop'],
        });

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        await t.action(notifyRef, { pendingId });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] ?? [];
        // Custom primary domain wins over the platform alternative.
        expect(url).toBe('https://custom-shop.example.com/api/revalidate/convex');

        const sentBody = init?.body as string;
        const headers = init?.headers as Record<string, string>;
        // Canonical, fixed-key-order serialization the Next verifier re-derives.
        const parsed = JSON.parse(sentBody) as Record<string, unknown>;
        expect(Object.keys(parsed)).toEqual(['collection', 'eventId', 'legacyShopId', 'tags', 'tenantId', 'ts']);
        expect(parsed.tenantId).toBe('legacy-shop-1');
        expect(parsed.legacyShopId).toBe('legacy-shop-1');
        expect(parsed.collection).toBe('pages');
        expect(parsed.tags).toEqual(['cms.legacy-shop-1.pages.about', 'cms.legacy-shop-1.pages']);

        // Signature round-trips against the verifier's algorithm and secret.
        expect(headers['x-convex-hmac-sha256']).toBe(await expectedSignature(sentBody, SECRET));

        // 2xx acks the window: the pending row is cleared.
        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(0);
    });

    it('falls back to the platform domain when the shop has no custom primary domain', async () => {
        const t = convexTest(schema, modules);
        const pendingId = await seedDelivery(t, { domain: '', alternativeDomains: ['legacy-shop.nordcom.shop'] });

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        await t.action(notifyRef, { pendingId });

        const [url] = fetchMock.mock.calls[0] ?? [];
        expect(url).toBe('https://legacy-shop.nordcom.shop/api/revalidate/convex');
    });

    it('throws on a 503 (and any non-2xx) and leaves the pending row intact so the retrier re-fires', async () => {
        const t = convexTest(schema, modules);
        const pendingId = await seedDelivery(t, { domain: 'custom-shop.example.com' });

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(t.action(notifyRef, { pendingId })).rejects.toThrowError(ConvexError);

        // The window is NOT acked — a later retry still has the coalesced tags.
        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(1);
    });

    it('throws on a 4xx (non-2xx) without acking', async () => {
        const t = convexTest(schema, modules);
        const pendingId = await seedDelivery(t, { domain: 'custom-shop.example.com' });

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));
        vi.stubGlobal('fetch', fetchMock);

        await expect(t.action(notifyRef, { pendingId })).rejects.toThrowError(ConvexError);

        const pending = await t.run((ctx) => ctx.db.query('pendingRevalidations').collect());
        expect(pending).toHaveLength(1);
    });

    it('no-ops when the pending row was already drained by a prior ack', async () => {
        const t = convexTest(schema, modules);
        const pendingId = await seedDelivery(t, { domain: 'custom-shop.example.com' });
        await t.run((ctx) => ctx.db.delete('pendingRevalidations', pendingId));

        const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);

        await t.action(notifyRef, { pendingId });

        expect(fetchMock).not.toHaveBeenCalled();
    });
});
