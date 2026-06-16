import { ConvexError, v } from 'convex/values';

import { internal } from '../_generated/api';
import { systemMutation } from '../lib/system';
import { coalescePending, recordEventOnce } from './idempotency';
import { deriveRevalidateTags } from './tags';

/**
 * Stable string codes carried on every {@link ConvexError} this module throws, so the scheduler and
 * `convex-test` branch on the failure cause without string-matching messages. Convex functions run in
 * the Convex isolate where `@nordcom/commerce-errors` is off the bundle surface, so a `ConvexError`
 * payload with a stable code is the sanctioned in-runtime error contract (the same pattern as
 * `cms/documents.ts`'s `CmsDocumentErrorCode` and `revalidate/notify.ts`'s `NotifyErrorCode`).
 */
export const OnPublishErrorCode = {
    /** The published document's tenant resolves to no `shops` row, so no storefront can be revalidated. */
    SHOP_NOT_FOUND: 'PUBLISH_SHOP_NOT_FOUND',
} as const;

/**
 * The coalescing debounce window, in milliseconds, between a publish committing and its single
 * revalidation delivery firing. A publish arms ONE delivery at this delay; every further publish for the
 * same `(tenant, collection)` within the window merges into the existing coalescing row instead of
 * arming a second delivery, so a burst of rapid publishes (an editor mashing "save & publish", an
 * autosave that flips to published) collapses to a single notify. Exported so tests can assert the
 * scheduled delay precisely rather than hard-coding a literal.
 */
export const REVALIDATE_DEBOUNCE_MS = 2_000;

/**
 * Per-collection field whose value is the cache leaf key for a published document. Keyed by the same
 * collection slugs `cms/documents.ts` writes (`tables/cms.ts`): `pages`/`articles` bust by `slug`,
 * `productMetadata`/`collectionMetadata` by `shopifyHandle`. Collections absent from the map — the
 * tenant singletons (`header`/`footer`) and anything outside the CMS cache taxonomy —
 * have no per-document leaf, so they bust at the collection/tenant level only.
 */
const LEAF_KEY_FIELD_BY_COLLECTION: Record<string, string> = {
    pages: 'slug',
    articles: 'slug',
    productMetadata: 'shopifyHandle',
    collectionMetadata: 'shopifyHandle',
};

/**
 * Extracts the cache leaf key (slug/handle) a published document busts, so the derived revalidation tags
 * pin the exact entity rather than over-busting the whole collection. Reads the leaf field selected by
 * {@link LEAF_KEY_FIELD_BY_COLLECTION} from the document's serialized `data`; a collection with no leaf
 * field, or an absent/blank leaf value, yields `undefined` (a collection-level bust). Lives here, beside
 * the publish hook, so the publish path's one-line wiring in `cms/documents.ts` stays a pure call.
 *
 * @param collection - The published document's collection slug, selecting its leaf field.
 * @param data - The document's serialized field map.
 * @returns The trimmed leaf key, or `undefined` when the collection has no leaf or the value is empty.
 */
export function cmsRevalidateKey(collection: string, data: unknown): string | undefined {
    const field = LEAF_KEY_FIELD_BY_COLLECTION[collection];
    if (field === undefined) return undefined;

    const record = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    const value = record[field];
    if (typeof value !== 'string') return undefined;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Post-commit revalidation hook for a CMS publish — the Convex-native replacement for Payload's
 * `revalidateForManifest`. The `cms/documents.ts` save mutation schedules this (via
 * `ctx.scheduler.runAfter(0, …)`) ONLY on a `published` status, so a draft/autosave save — which never
 * flips to published — schedules zero revalidation work. Scheduling it post-commit (never inline) is what
 * guarantees the publish's `cmsDocuments`/`cmsVersions` writes are durable before any cache tag is
 * derived from them.
 *
 * On each published transition it:
 * - resolves the tenant's STRING `legacyId` (the id the bridge keys tags and delivery on, BRIDGE-01/03)
 *   from the server-trusted `shopId`;
 * - records the publish `eventId` once ({@link recordEventOnce}); a redelivered `eventId` is a verified
 *   no-op, so an at-least-once replay never double-schedules;
 * - derives the cache tags from the shared descriptor ({@link deriveRevalidateTags}, BRIDGE-03);
 * - folds them into the single per-`(tenant, collection)` coalescing window ({@link coalescePending},
 *   BRIDGE-04) — only the publish that finds NO delivery already armed schedules the lone delivery,
 *   collapsing a burst to one delivery;
 * - and, when it owns scheduling, arms exactly one debounced `internal.revalidate.delivery.enqueueDelivery`
 *   at {@link REVALIDATE_DEBOUNCE_MS} and stamps its scheduled handle onto the coalescing row. Routing
 *   through `enqueueDelivery` — never `notify` directly — is what makes the delivery durable from the
 *   FIRST attempt: the action-retrier owns every attempt (BRIDGE-07), so a non-2xx on attempt #1
 *   re-fires with bounded backoff and dead-letters on exhaustion, instead of silently waiting for the
 *   reconcile cron to adopt the lost window.
 *
 * Built on {@link systemMutation} (raw, un-RLS db): the revalidation bridge tables are platform-global
 * infrastructure with no tenant key, so they sit outside the per-tenant RLS tier — exactly the
 * scheduled-job exemption `systemMutation` exists for, and the reason the tenant-scoped save mutation
 * dispatches here rather than writing the bridge tables itself.
 *
 * @param ctx - The system mutation context (raw `db`, `scheduler`).
 * @param args - The publish's `shopId`, `collection`, optional leaf `key`, and dedup `eventId`.
 * @returns `{ scheduled: true }` when this call armed the window's lone notify; `{ scheduled: false }`
 *   when it coalesced into an already-armed window or was a deduped redelivery.
 * @throws {ConvexError} `PUBLISH_SHOP_NOT_FOUND` when `shopId` resolves to no `shops` row.
 */
export const onPublish = systemMutation({
    args: {
        shopId: v.id('shops'),
        collection: v.string(),
        key: v.optional(v.string()),
        eventId: v.string(),
    },
    handler: async (ctx, { shopId, collection, key, eventId }): Promise<{ scheduled: boolean }> => {
        const shop = await ctx.db.get('shops', shopId);
        if (!shop) {
            throw new ConvexError({ code: OnPublishErrorCode.SHOP_NOT_FOUND, shopId });
        }

        const fresh = await recordEventOnce(ctx, eventId);
        if (!fresh) {
            return { scheduled: false };
        }

        const tenantId = shop.legacyId;
        const tags = deriveRevalidateTags({ collection, key, tenantId });
        const { alreadyScheduled, pendingId } = await coalescePending(ctx, { tenantId, collection, tags });
        if (alreadyScheduled) {
            return { scheduled: false };
        }

        const scheduledJobId = await ctx.scheduler.runAfter(
            REVALIDATE_DEBOUNCE_MS,
            internal.revalidate.delivery.enqueueDelivery,
            { pendingId },
        );
        await ctx.db.patch('pendingRevalidations', pendingId, { scheduledJobId });
        return { scheduled: true };
    },
});
