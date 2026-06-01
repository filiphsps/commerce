import { ConvexError, v } from 'convex/values';

import { internal } from '../_generated/api';
import { internalAction } from '../_generated/server';
import { getServerEnv } from '../lib/env';
import { systemMutation, systemQuery } from '../lib/system';

/**
 * Stable string codes carried on every {@link ConvexError} this module throws, so the scheduler/retrier
 * and `convex-test` can branch on the failure cause without string-matching messages. Convex functions
 * run in the Convex isolate (not Node) and `@nordcom/commerce-errors` is NOT on the Convex bundle's
 * dependency surface, so — exactly as `lib/auth.ts` and `lib/migrations.ts` document — a local
 * `ConvexError` payload is the sanctioned in-runtime error contract here.
 */
export const NotifyErrorCode = {
    /** `CONVEX_REVALIDATE_SECRET` is unset, so the body cannot be HMAC-signed. */
    SECRET_NOT_CONFIGURED: 'SECRET_NOT_CONFIGURED',
    /** The pending row's `tenantId` resolves to no `shops` row (a poison delivery). */
    UNKNOWN_TENANT: 'UNKNOWN_TENANT',
    /** The resolved shop carries neither a primary nor a platform storefront host. */
    NO_STOREFRONT_DOMAIN: 'NO_STOREFRONT_DOMAIN',
    /** The storefront answered with a non-2xx status, so the delivery is NOT acknowledged and must re-fire. */
    DELIVERY_NOT_ACKED: 'DELIVERY_NOT_ACKED',
} as const;

/** Header carrying the base64 HMAC-SHA256 of the raw body, the exact name the Next verifier reads. */
const HMAC_HEADER = 'x-convex-hmac-sha256';

/**
 * Wire contract for a single Convex→Next revalidation event. This MIRRORS the storefront-side
 * `RevalidateEventPayload` (BRIDGE-01, `apps/storefront/src/api/_revalidate-convex.ts`): the field
 * names/types and their canonical serialization are the cross-bridge contract, and the Convex producer
 * cannot import the Next package, so the shape is re-declared here and kept byte-identical. Changing it
 * is a breaking change on BOTH sides of the bridge.
 *
 * @property eventId - Unique id for this emission; the Next side dedups/idempotency-keys on it.
 * @property tenantId - The string tenant id that prefixes every derived cache tag (BRIDGE-03).
 * @property legacyShopId - The Mongo-era shop id the Next route uses as the cache tenant key and Apollo-pool prefix.
 * @property collection - The CMS collection that changed (drives which tag family was busted).
 * @property tags - The concrete cache tags to revalidate.
 * @property ts - Emission time in epoch ms; the Next side's staleness guard rejects replays older than its window.
 */
type RevalidateEventPayload = {
    eventId: string;
    tenantId: string;
    legacyShopId: string;
    collection: string;
    tags: string[];
    ts: number;
};

/**
 * Serializes a revalidation payload to the canonical, fixed-key-order JSON string the Next verifier
 * signs and re-derives. Mirrors `canonicalizeRevalidatePayload` (BRIDGE-01) EXACTLY — keys emitted in
 * fixed alphabetical order so the producer and consumer compute byte-identical bodies and the HMAC is
 * reproducible regardless of object key insertion order.
 *
 * @param payload - The event payload to serialize.
 * @returns A deterministic JSON string with keys in fixed alphabetical order.
 */
function canonicalizeRevalidatePayload(payload: RevalidateEventPayload): string {
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
 * Base64-encodes raw bytes using the Convex runtime's `btoa` (no Node `Buffer` in the isolate). Folds
 * the byte array into a binary string first, because `btoa` operates on a binary-string, not a typed
 * array.
 *
 * @param bytes - The raw bytes to encode.
 * @returns The standard base64 (not URL-safe) encoding of `bytes`.
 */
function base64FromBytes(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    return btoa(binary);
}

/**
 * Computes the base64 HMAC-SHA256 of a body with a secret, byte-identically to the Next verifier's
 * `createHmac('sha256', secret).update(body, 'utf8').digest('base64')`. Uses Web Crypto (`crypto.subtle`)
 * rather than `node:crypto` because Convex's default runtime exposes Web Crypto, not Node's, and the two
 * produce the same digest — so a body signed here round-trips against `verifyRevalidateHmac`.
 *
 * @param body - The canonical request body to sign (the exact bytes the HMAC is computed over).
 * @param secret - The current signing secret.
 * @returns The base64-encoded HMAC-SHA256 signature.
 */
async function signRevalidateBody(body: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
        'sign',
    ]);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    return base64FromBytes(new Uint8Array(signature));
}

/**
 * Selects the storefront-facing host for a shop, preferring the custom primary domain over a
 * platform-issued fallback. Mirrors the storefront middleware's canonical-domain choice (it serves from
 * `shop.domain`): the primary `domain` is the merchant's custom storefront host, so it wins whenever it
 * is set. When a shop has no custom primary domain yet, the first non-empty `alternativeDomains` entry —
 * the platform-issued host (e.g. a `*.nordcom.*` subdomain) — is used so revalidation still reaches the
 * live storefront.
 *
 * @param shop - The shop's primary `domain` and optional `alternativeDomains` platform hosts.
 * @returns The selected host (no scheme), or `undefined` when the shop carries no usable storefront host.
 */
function selectStorefrontHost(shop: { domain: string; alternativeDomains?: string[] }): string | undefined {
    const custom = shop.domain.trim();
    if (custom.length > 0) {
        return custom;
    }

    const platform = shop.alternativeDomains?.map((domain) => domain.trim()).find((domain) => domain.length > 0);
    return platform;
}

/**
 * Resolves everything a single delivery needs from a pending coalescing row: the coalesced tags and
 * (tenant, collection) plus the resolved shop's `legacyShopId` and storefront URL. Returns `null` when
 * the pending row is already gone (a re-fire after the delivery was acknowledged and the row drained),
 * so the action can no-op rather than re-deliver. Runs on the system tier (no RLS) because the bridge
 * operates across tenants with no tenant context — it is the step that establishes the delivery target.
 *
 * @throws {ConvexError} `UNKNOWN_TENANT` when the row's `tenantId` resolves to no `shops` row.
 * @throws {ConvexError} `NO_STOREFRONT_DOMAIN` when the resolved shop has no usable storefront host.
 */
export const loadDelivery = systemQuery({
    args: { pendingId: v.id('pendingRevalidations') },
    handler: async (ctx, { pendingId }) => {
        const pending = await ctx.db.get('pendingRevalidations', pendingId);
        if (!pending) {
            return null;
        }

        const shop = await ctx.db
            .query('shops')
            .withIndex('by_legacy_id', (q) => q.eq('legacyId', pending.tenantId))
            .unique();
        if (!shop) {
            throw new ConvexError({ code: NotifyErrorCode.UNKNOWN_TENANT, tenantId: pending.tenantId });
        }

        const host = selectStorefrontHost(shop);
        if (!host) {
            throw new ConvexError({ code: NotifyErrorCode.NO_STOREFRONT_DOMAIN, tenantId: pending.tenantId });
        }

        return {
            collection: pending.collection,
            tags: pending.tags,
            tenantId: pending.tenantId,
            legacyShopId: shop.legacyId,
            storefrontUrl: `https://${host}`,
        };
    },
});

/**
 * Acknowledges a delivered window by deleting its pending row. Clearing the row IS the ack: it both
 * marks the window delivered and re-arms the next publish to schedule a fresh delivery (the
 * `scheduledJobId` handle is gone with the row), advancing the per-tenant window cursor. Idempotent —
 * a row already drained by a concurrent ack is a verified no-op.
 */
export const ackDelivery = systemMutation({
    args: { pendingId: v.id('pendingRevalidations') },
    handler: async (ctx, { pendingId }) => {
        const pending = await ctx.db.get('pendingRevalidations', pendingId);
        if (pending) {
            await ctx.db.delete('pendingRevalidations', pendingId);
        }
    },
});

/**
 * Delivers a coalesced revalidation window to the storefront's `/api/revalidate/convex` endpoint.
 *
 * Resolves the per-tenant storefront URL (custom primary domain preferred, platform fallback otherwise),
 * builds the {@link RevalidateEventPayload}, signs the canonical body with the CURRENT
 * `CONVEX_REVALIDATE_SECRET` (round-tripping against the Next verifier), and POSTs it. ANY non-2xx
 * response — including a 503 retryable infra signal — throws so the Convex action-retrier re-fires the
 * delivery; the pending row is left intact so a later run still has the coalesced tags. On a 2xx the
 * delivery is acknowledged by clearing the pending row (see {@link ackDelivery}). A pending row that has
 * already been drained (a re-fire after a prior ack) is a no-op.
 *
 * @param pendingId - The pending coalescing row to deliver.
 * @throws {ConvexError} `SECRET_NOT_CONFIGURED` when `CONVEX_REVALIDATE_SECRET` is unset.
 * @throws {ConvexError} `DELIVERY_NOT_ACKED` when the storefront answers with a non-2xx status.
 */
export const notify = internalAction({
    args: { pendingId: v.id('pendingRevalidations') },
    handler: async (ctx, { pendingId }): Promise<void> => {
        const delivery = await ctx.runQuery(internal.revalidate.notify.loadDelivery, { pendingId });
        if (!delivery) {
            return;
        }

        const secret = getServerEnv('CONVEX_REVALIDATE_SECRET');
        if (!secret) {
            throw new ConvexError({ code: NotifyErrorCode.SECRET_NOT_CONFIGURED });
        }

        const payload: RevalidateEventPayload = {
            eventId: crypto.randomUUID(),
            tenantId: delivery.tenantId,
            legacyShopId: delivery.legacyShopId,
            collection: delivery.collection,
            tags: delivery.tags,
            ts: Date.now(),
        };
        const body = canonicalizeRevalidatePayload(payload);
        const signature = await signRevalidateBody(body, secret);

        const response = await fetch(`${delivery.storefrontUrl}/api/revalidate/convex`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [HMAC_HEADER]: signature,
            },
            body,
        });

        if (!response.ok) {
            throw new ConvexError({
                code: NotifyErrorCode.DELIVERY_NOT_ACKED,
                status: response.status,
                tenantId: delivery.tenantId,
            });
        }

        await ctx.runMutation(internal.revalidate.notify.ackDelivery, { pendingId });
    },
});
