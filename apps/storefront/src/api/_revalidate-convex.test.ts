import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
    canonicalizeRevalidatePayload,
    isStaleTs,
    type RevalidateEventPayload,
    verifyRevalidateHmac,
} from './_revalidate-convex';

// These tests pin the Convex→Next revalidation bridge contract: a stable,
// reproducible canonical serialization (so the HMAC is order-independent) and
// a dual-accept verifier that tolerates one in-flight secret rotation.

const CURRENT = 'current-secret';
const PREVIOUS = 'previous-secret';

const sample: RevalidateEventPayload = {
    eventId: 'evt_123',
    tenantId: 'tenant_abc',
    legacyShopId: 'shop_legacy_1',
    collection: 'products',
    tags: ['product:1', 'collection:all'],
    ts: 1_700_000_000_000,
};

/**
 * Computes the base64 HMAC-SHA256 of a body with a given secret — mirrors the
 * production signing the Convex side performs so tests sign exactly as it would.
 *
 * @param body - Raw request body to sign.
 * @param secret - HMAC key.
 * @returns Base64-encoded signature.
 */
function sign(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body, 'utf8').digest('base64');
}

describe('canonicalizeRevalidatePayload', () => {
    it('produces identical output regardless of input key order', () => {
        const reordered: RevalidateEventPayload = {
            ts: sample.ts,
            tags: sample.tags,
            collection: sample.collection,
            legacyShopId: sample.legacyShopId,
            tenantId: sample.tenantId,
            eventId: sample.eventId,
        };
        expect(canonicalizeRevalidatePayload(reordered)).toBe(canonicalizeRevalidatePayload(sample));
    });

    it('serializes to deterministic JSON', () => {
        expect(canonicalizeRevalidatePayload(sample)).toBe(
            '{"collection":"products","eventId":"evt_123","legacyShopId":"shop_legacy_1","tags":["product:1","collection:all"],"tenantId":"tenant_abc","ts":1700000000000}',
        );
    });
});

describe('verifyRevalidateHmac', () => {
    const body = canonicalizeRevalidatePayload(sample);

    it('accepts a signature made with the current secret', () => {
        expect(verifyRevalidateHmac(body, sign(body, CURRENT), { current: CURRENT, previous: PREVIOUS })).toBe(true);
    });

    it('accepts a signature made with the previous secret (rotation window)', () => {
        expect(verifyRevalidateHmac(body, sign(body, PREVIOUS), { current: CURRENT, previous: PREVIOUS })).toBe(true);
    });

    it('rejects a signature made with a wrong secret', () => {
        expect(verifyRevalidateHmac(body, sign(body, 'wrong-secret'), { current: CURRENT, previous: PREVIOUS })).toBe(
            false,
        );
    });

    it('rejects a tampered body', () => {
        const sig = sign(body, CURRENT);
        expect(verifyRevalidateHmac(`${body} `, sig, { current: CURRENT, previous: PREVIOUS })).toBe(false);
    });

    it('returns false (does not throw) for a length-mismatched signature', () => {
        expect(() => verifyRevalidateHmac(body, 'too-short', { current: CURRENT, previous: PREVIOUS })).not.toThrow();
        expect(verifyRevalidateHmac(body, 'too-short', { current: CURRENT, previous: PREVIOUS })).toBe(false);
    });

    it('returns false for a null/empty signature', () => {
        expect(verifyRevalidateHmac(body, null, { current: CURRENT })).toBe(false);
        expect(verifyRevalidateHmac(body, '', { current: CURRENT })).toBe(false);
    });

    it('works without a previous secret configured', () => {
        expect(verifyRevalidateHmac(body, sign(body, CURRENT), { current: CURRENT })).toBe(true);
    });
});

describe('isStaleTs', () => {
    it('reports an old timestamp as stale', () => {
        const now = 1_700_000_100_000;
        expect(isStaleTs(now - 60_000, 30_000, now)).toBe(true);
    });

    it('reports an in-window timestamp as fresh', () => {
        const now = 1_700_000_100_000;
        expect(isStaleTs(now - 10_000, 30_000, now)).toBe(false);
    });

    it('treats the exact window boundary as fresh', () => {
        const now = 1_700_000_100_000;
        expect(isStaleTs(now - 30_000, 30_000, now)).toBe(false);
    });
});
