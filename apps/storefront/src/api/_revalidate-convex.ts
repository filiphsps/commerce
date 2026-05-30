import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Wire contract for a single Convex→Next revalidation event.
 *
 * Convex emits one of these per publish/mutation that should bust storefront
 * cache. It is the authoritative shape signed by {@link canonicalizeRevalidatePayload}
 * and verified by {@link verifyRevalidateHmac}; field names and types are the
 * contract — changing them is a breaking change on both sides of the bridge.
 *
 * @property eventId - Unique id for this emission; used for dedupe/idempotency downstream.
 * @property tenantId - Convex tenant identifier the event belongs to.
 * @property legacyShopId - Mongo-era shop id, retained so the Next side can map to existing tenant records during migration.
 * @property collection - Convex collection/table that changed (drives which tag family to bust).
 * @property tags - Concrete cache tags to revalidate.
 * @property ts - Emission time in epoch milliseconds; consumed by {@link isStaleTs} for replay/staleness rejection.
 */
export type RevalidateEventPayload = {
    eventId: string;
    tenantId: string;
    legacyShopId: string;
    collection: string;
    tags: string[];
    ts: number;
};

/**
 * Secret material for {@link verifyRevalidateHmac}, supporting zero-downtime rotation.
 *
 * @property current - The active signing secret.
 * @property previous - The prior secret, accepted during a rotation window; omit once rotation has fully propagated.
 */
export type RevalidateHmacSecrets = {
    current: string;
    previous?: string;
};

/**
 * Serializes a revalidation payload to a canonical, stable-key-order JSON string.
 *
 * Emitting fields in a fixed order makes the output deterministic regardless of
 * the input object's key insertion order, so both the Convex signer and the
 * Next verifier produce byte-identical bodies and the HMAC is reproducible.
 *
 * @param payload - The event payload to serialize.
 * @returns A deterministic JSON string with keys in fixed alphabetical order.
 */
export function canonicalizeRevalidatePayload(payload: RevalidateEventPayload): string {
    return JSON.stringify({
        collection: payload.collection,
        eventId: payload.eventId,
        legacyShopId: payload.legacyShopId,
        tags: payload.tags,
        tenantId: payload.tenantId,
        ts: payload.ts,
    });
}

/**
 * Verifies a Convex→Next revalidation HMAC, accepting the current OR previous secret.
 *
 * Dual-accept lets a secret be rotated without dropping in-flight deliveries: a
 * body signed with either configured secret is honored during the rotation
 * window. Comparison is constant-time via {@link timingSafeEqual}, with an
 * explicit length guard so a malformed signature returns `false` rather than
 * throwing. Distinct from Shopify webhook verification — this is the Convex bridge.
 *
 * @param rawBody - Raw, unmodified request body string; must be the bytes that were signed (see {@link canonicalizeRevalidatePayload}).
 * @param signature - The base64 signature header value; `null`/empty rejects immediately.
 * @param secrets - The current and optional previous signing secrets.
 * @returns `true` when the signature matches the HMAC computed with either secret; `false` otherwise.
 */
export function verifyRevalidateHmac(
    rawBody: string,
    signature: string | null,
    secrets: RevalidateHmacSecrets,
): boolean {
    if (!signature) return false;

    const candidate = Buffer.from(signature);

    for (const secret of [secrets.current, secrets.previous]) {
        if (!secret) continue;
        const computed = Buffer.from(createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64'));
        if (computed.length !== candidate.length) continue;
        if (timingSafeEqual(computed, candidate)) return true;
    }

    return false;
}

/**
 * Determines whether an event timestamp has aged out of an acceptance window.
 *
 * Used to reject stale or replayed deliveries. The window is a parameter and
 * `now` is injectable to keep the function deterministic under test; in runtime
 * code `now` defaults to {@link Date.now}.
 *
 * @param ts - Event emission time in epoch milliseconds.
 * @param windowMs - Maximum allowed age in milliseconds; ages at exactly the boundary are still fresh.
 * @param now - Current time in epoch milliseconds; defaults to `Date.now()`.
 * @returns `true` when `ts` is older than `windowMs` from `now` (stale); `false` when within the window.
 */
export function isStaleTs(ts: number, windowMs: number, now: number = Date.now()): boolean {
    return now - ts > windowMs;
}
