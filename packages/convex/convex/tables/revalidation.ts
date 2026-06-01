import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';

/**
 * Stored row for the revalidation-event dedup ledger. Each row records that a Convex→Next publish
 * event with a given `eventId` has been observed, so a redelivery of the SAME event is a verified
 * no-op rather than a second cache bust (the at-least-once delivery of a webhook/scheduler can replay
 * the same event). The dedup key is the opaque `eventId` from the shared publish-event payload
 * (BRIDGE-01); membership is tested via the `by_eventId` index.
 *
 * `seenAt` is the epoch-ms time the event was first recorded. It exists so a later reaper cron can
 * prune dedup keys older than the replay window (the same window {@link isStale} enforces on the
 * read side): an `eventId` can only be replayed within that window, so keys beyond it are dead weight.
 */
export const revalidationEventValidator = v.object({
    eventId: v.string(),
    seenAt: v.number(),
});

/**
 * Inferred row shape for a deduped revalidation event. See {@link revalidationEventValidator}.
 */
export type RevalidationEvent = Infer<typeof revalidationEventValidator>;

/**
 * Stored row for the per-(tenant, collection) coalescing buffer. One row holds the UNION of cache
 * tags accumulated by every publish for that pair during a single debounce window, plus the handle
 * of the single delivery the window scheduled. Keeping one row per pair is what lets a burst of rapid
 * publishes collapse into one notify: subsequent publishes merge their tags into the existing row
 * instead of arming a second delivery (see `coalescePending` in `revalidate/idempotency.ts`).
 *
 * `tenantId` is the STRING tenant identifier carried end-to-end by the bridge payload (BRIDGE-01/03),
 * NOT a `v.id('shops')` reference — the publish event derives its tags from this string id without a
 * shop-by-domain lookup, so the buffer keys on the same string rather than the tenant `by_shop`
 * convention. `collection` is the CMS collection the publish targeted; the `by_tenant_collection`
 * index makes the (tenant, collection) lookup a point read.
 *
 * `scheduledJobId` is the `_scheduled_functions` handle of the delivery armed for this window, present
 * once a caller has scheduled it. It both reports that a notify is already in flight (so the next
 * publish coalesces rather than re-schedules) and lets the caller cancel/observe that delivery. The
 * delivery MUST remove this row when it fires, re-arming the next window's first publish to schedule
 * afresh.
 */
export const pendingRevalidationValidator = v.object({
    tenantId: v.string(),
    collection: v.string(),
    tags: v.array(v.string()),
    scheduledJobId: v.optional(v.id('_scheduled_functions')),
});

/**
 * Inferred row shape for a coalesced pending revalidation. See {@link pendingRevalidationValidator}.
 */
export type PendingRevalidation = Infer<typeof pendingRevalidationValidator>;

/**
 * In-flight context for a single retrier-managed delivery, keyed by the action-retrier `runId`. The
 * retrier's `onComplete` callback (BRIDGE-07) receives ONLY `{ runId, result }` — never the action's
 * arguments — so the durable-delivery layer snapshots everything a terminal-failure dead-letter row
 * needs (the originating `pendingId` plus the tenant/collection/tags being delivered) into this row
 * when the run is enqueued, then resolves it back by `runId` once the run completes. The snapshot is
 * taken at enqueue time rather than re-read from `pendingRevalidations` at completion because a
 * concurrent ack may have drained the pending row by then; snapshotting keeps the dead-letter record
 * complete regardless. Rows are deleted the moment the run completes (success, exhausted failure, or
 * cancellation), so this table holds only deliveries currently in flight.
 *
 * `runId` is the action-retrier's opaque string handle (a branded string on the client, stored here as
 * a plain `v.string()`); the `by_run_id` index makes the completion-time lookup a point read.
 */
export const revalidationDeliveryValidator = v.object({
    runId: v.string(),
    pendingId: v.id('pendingRevalidations'),
    tenantId: v.string(),
    collection: v.string(),
    tags: v.array(v.string()),
});

/**
 * Inferred row shape for an in-flight retrier delivery. See {@link revalidationDeliveryValidator}.
 */
export type RevalidationDelivery = Infer<typeof revalidationDeliveryValidator>;

/**
 * Dead-letter record for a revalidation delivery that exhausted every action-retrier attempt without
 * a 2xx ack (BRIDGE-07). One row is written exactly once, by the retrier's `onComplete` callback, when
 * a run terminates in the `failed` state — at which point the poison `pendingRevalidations` row is
 * dropped (it can never deliver) and an alert is fired. The row carries the full delivery context
 * snapshot so an operator can diagnose or hand-replay the bust: `tenantId`/`collection`/`tags` identify
 * exactly which cache bust was lost, `error` is the retrier's terminal failure message, and `runId`
 * ties the record back to the retrier run for cross-referencing.
 *
 * `pendingId` is the originating coalescing row's id, retained for traceability even though that row is
 * deleted on dead-letter (it stays valid as a historical reference). `by_tenant_collection` mirrors the
 * coalescing buffer's index so the dead-letter history for a (tenant, collection) pair is a point scan.
 */
export const revalidationDeadLetterValidator = v.object({
    pendingId: v.id('pendingRevalidations'),
    tenantId: v.string(),
    collection: v.string(),
    tags: v.array(v.string()),
    error: v.string(),
    runId: v.string(),
    deadLetteredAt: v.number(),
});

/**
 * Inferred row shape for a dead-lettered revalidation delivery. See {@link revalidationDeadLetterValidator}.
 */
export type RevalidationDeadLetter = Infer<typeof revalidationDeadLetterValidator>;

/**
 * The revalidation bridge's infrastructure tables. `revalidationEvents` is keyed for dedup by
 * `by_eventId`; `pendingRevalidations` is keyed for coalescing by `by_tenant_collection`;
 * `revalidationDeliveries` tracks in-flight retrier runs by `by_run_id`; `revalidationDeadLetters`
 * records exhausted deliveries by `by_tenant_collection`. All are platform-global bridge infrastructure
 * (written only by the server-trusted system tier), so they are spread into `coreTables` via
 * `tables/index.ts`, then into `defineSchema`. Their indexes intentionally deviate from the `by_shop`
 * tenant convention: the bridge operates on the string tenant id from the publish payload, not a
 * `v.id('shops')` foreign key.
 */
export const revalidationTables = {
    revalidationEvents: defineTable(revalidationEventValidator).index('by_eventId', ['eventId']),
    pendingRevalidations: defineTable(pendingRevalidationValidator).index('by_tenant_collection', [
        'tenantId',
        'collection',
    ]),
    revalidationDeliveries: defineTable(revalidationDeliveryValidator).index('by_run_id', ['runId']),
    revalidationDeadLetters: defineTable(revalidationDeadLetterValidator).index('by_tenant_collection', [
        'tenantId',
        'collection',
    ]),
};
