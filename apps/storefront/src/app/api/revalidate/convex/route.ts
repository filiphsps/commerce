import type { OnlineShop } from '@nordcom/commerce-db';
import { trace } from '@opentelemetry/api';
import { NextResponse } from 'next/server';
import { evictApolloClient } from '@/api/_apollo-pool';
import { isStaleTs, type RevalidateEventPayload, verifyRevalidateHmac } from '@/api/_revalidate-convex';
import { cache } from '@/cache';

const noStoreHeaders = { 'Cache-Control': 'no-store' };
const retryableHeaders = { ...noStoreHeaders, 'Retry-After': '30' };

/** Header carrying the base64 HMAC-SHA256 of the raw body, signed by Convex. */
const HMAC_HEADER = 'x-convex-hmac-sha256';

/**
 * Maximum age, in milliseconds, a signed event may have before it is treated as
 * a stale replay and skipped. Bounds the window in which a captured-and-resent
 * valid delivery can act, while still tolerating normal network/queue latency.
 */
const STALE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Narrows an arbitrary parsed JSON value to a {@link RevalidateEventPayload}.
 *
 * A valid HMAC proves the body came from Convex, but a signed-yet-malformed body
 * still must not flow into the cache tail (a missing `legacyShopId` would make the
 * broad-sweep tenant key meaningless). This guard rejects such bodies with a 400.
 *
 * @param value - The parsed JSON value to validate.
 * @returns `true` when `value` has every field of {@link RevalidateEventPayload} with the correct type and a non-empty `legacyShopId`.
 */
function isRevalidateEventPayload(value: unknown): value is RevalidateEventPayload {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v.eventId === 'string' &&
        typeof v.tenantId === 'string' &&
        typeof v.legacyShopId === 'string' &&
        v.legacyShopId.length > 0 &&
        typeof v.collection === 'string' &&
        Array.isArray(v.tags) &&
        v.tags.every((tag) => typeof tag === 'string') &&
        typeof v.ts === 'number' &&
        Number.isFinite(v.ts)
    );
}

/**
 * Receives a Convex→Next revalidation event and busts the matching storefront caches.
 *
 * Unlike the Shopify revalidate route — which resolves the shop from the URL
 * before validating — this top-level, non-tenant-scoped route reads its tenant
 * from the SIGNED body and therefore verifies the HMAC FIRST. A request that
 * fails verification must reach zero tenant resolution or cache side effects, so
 * an unauthenticated POST cannot probe tenants or burst caches. On success it
 * reuses only the cache-invalidation tail: per-tag invalidation when tags are
 * present, otherwise a tenant broad-sweep, plus Apollo-pool eviction.
 *
 * @param request - The incoming webhook request; its raw body is the exact bytes the HMAC was computed over.
 * @returns `401` for a missing/invalid signature; `400` for a signed-but-malformed body; `503` (+ `Retry-After`) when the secret is unconfigured or cache invalidation fails; `200` on success or for an acknowledged stale event.
 */
export async function POST(request: Request): Promise<NextResponse> {
    const rawBody = await request.text();
    const signature = request.headers.get(HMAC_HEADER);

    const current = process.env.CONVEX_REVALIDATE_SECRET;
    if (!current) {
        // Cannot verify without a secret. Treat as retryable infra
        // misconfiguration (503) rather than silently accepting unsigned input.
        return NextResponse.json(
            { status: 503, error: 'CONVEX_REVALIDATE_SECRET is not configured' },
            { status: 503, headers: retryableHeaders },
        );
    }
    const previous = process.env.CONVEX_REVALIDATE_SECRET_PREVIOUS;

    if (!verifyRevalidateHmac(rawBody, signature, { current, previous })) {
        return NextResponse.json({ status: 401, error: 'invalid HMAC' }, { status: 401, headers: noStoreHeaders });
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ status: 400, error: 'malformed body' }, { status: 400, headers: noStoreHeaders });
    }
    if (!isRevalidateEventPayload(parsed)) {
        return NextResponse.json(
            { status: 400, error: 'invalid payload shape' },
            { status: 400, headers: noStoreHeaders },
        );
    }
    const payload = parsed;

    // Replay/staleness guard: a captured valid delivery resent after the window
    // is acknowledged but not acted on, so a replay can't repeatedly burst caches
    // and a long-delayed retry isn't re-queued forever.
    if (isStaleTs(payload.ts, STALE_WINDOW_MS)) {
        return NextResponse.json({ status: 200, skipped: 'stale' }, { status: 200, headers: noStoreHeaders });
    }

    // `legacyShopId` is the Mongo-era id, which is both the cache tenant key and
    // the Apollo-pool key prefix, so it maps directly onto the existing tail —
    // letting us deliberately skip a shop-record DB lookup (the verify-first
    // contract forbids a pre-auth lookup).
    const shopId = payload.legacyShopId;
    try {
        if (payload.tags.length > 0) {
            await cache.invalidateRaw(payload.tags);
        } else {
            // No domain in the payload, so `extraTags(s) => [s.domain]` degrades
            // to a harmless unused tag (`shopify.<id>.undefined`, which matches
            // nothing); the id-rooted `shopify.<id>` tag does the actual sweep.
            await cache.invalidate.tenant({ id: shopId } as OnlineShop);
        }
        evictApolloClient({ shopId });
    } catch (error: unknown) {
        trace.getActiveSpan()?.addEvent('revalidate.convex.cache_failed', {
            'error.message': (error as Error)?.message ?? String(error),
            'shop.id': shopId,
        });
        return NextResponse.json(
            { status: 503, error: 'cache invalidation failed' },
            { status: 503, headers: retryableHeaders },
        );
    }

    return NextResponse.json(
        { status: 200, tags: payload.tags.length > 0 ? payload.tags : 'broad-sweep' },
        { status: 200, headers: noStoreHeaders },
    );
}

/**
 * Liveness/health probe for the Convex revalidate endpoint.
 *
 * @returns A `200` response with `no-store` headers.
 */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({ status: 200 }, { status: 200, headers: noStoreHeaders });
}
