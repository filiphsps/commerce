import { v } from 'convex/values';

import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { systemMutation } from '../lib/system';

/**
 * Determines whether an event timestamp has aged out of the replay-acceptance window.
 *
 * Mirrors the storefront-side `isStaleTs` (BRIDGE-01) exactly so the Convex producer and the Next
 * consumer agree on staleness: a timestamp at precisely the window boundary is still FRESH; only a
 * strictly older one is stale. `now` is injectable to keep the check deterministic under test and
 * defaults to {@link Date.now} in runtime code.
 *
 * @param ts - Event emission time in epoch milliseconds.
 * @param windowMs - Maximum allowed age in milliseconds; an age of exactly `windowMs` is still fresh.
 * @param now - Current time in epoch milliseconds; defaults to `Date.now()`.
 * @returns `true` when `ts` is older than `windowMs` from `now` (stale, reject); `false` otherwise.
 */
export function isStale(ts: number, windowMs: number, now: number = Date.now()): boolean {
    return now - ts > windowMs;
}

/**
 * Unions two tag lists, de-duplicating while preserving first-seen order. Folds a fresh publish's tags
 * into a pending window's accumulated set without ever emitting a tag twice — order is kept so the
 * union stays leaf-to-root readable (matching the read-side fanout ordering).
 *
 * @param existing - Tags already accumulated for the pending window.
 * @param incoming - Tags from the publish being coalesced in.
 * @returns The de-duplicated union, ordered by first appearance across `existing` then `incoming`.
 */
function mergeTags(existing: readonly string[], incoming: readonly string[]): string[] {
    return [...new Set([...existing, ...incoming])];
}

/**
 * Records a publish event's `eventId` in the dedup ledger when it has not been seen, returning whether
 * the write happened. A second call for the same `eventId` is a no-op that returns `false` — the
 * primitive that makes an at-least-once redelivery idempotent. Reads/writes the raw db, so callers must
 * already be on the server-trusted system tier (see {@link recordEvent}).
 *
 * @param ctx - A mutation context with raw db access.
 * @param eventId - The opaque publish-event id to dedup on.
 * @returns `true` when this call recorded a new event; `false` when `eventId` was already seen.
 */
export async function recordEventOnce(ctx: MutationCtx, eventId: string): Promise<boolean> {
    const existing = await ctx.db
        .query('revalidationEvents')
        .withIndex('by_eventId', (q) => q.eq('eventId', eventId))
        .unique();
    if (existing) {
        return false;
    }
    await ctx.db.insert('revalidationEvents', { eventId, seenAt: Date.now() });
    return true;
}

/**
 * Outcome of folding a publish into its (tenant, collection) coalescing window.
 *
 * @property alreadyScheduled - `true` when the window already carried a scheduled-delivery handle, so the caller MUST NOT arm a second notify; `false` when the caller still owns scheduling the single delivery for this window.
 * @property pendingId - Id of the created-or-merged pending row, so the caller can stamp its scheduled-delivery handle onto the row after arming the notify.
 */
export type CoalesceResult = {
    alreadyScheduled: boolean;
    pendingId: Id<'pendingRevalidations'>;
};

/**
 * Folds a publish's cache tags into the single per-(tenant, collection) coalescing window, creating the
 * window row on the first publish and merging into it thereafter. It REPORTS — but never performs —
 * scheduling: `alreadyScheduled` tells the caller whether a delivery is already armed for this window,
 * which is how a burst of rapid publishes collapses to AT MOST ONE notify (only the publish that sees
 * `alreadyScheduled === false` arms the delivery, then stamps its handle onto the row via `pendingId`).
 *
 * Reads/writes the raw db, so callers must already be on the server-trusted system tier (see
 * {@link coalesce}). Scheduling is left to the caller so the publish path (BRIDGE-05) can run
 * `scheduler.runAfter` post-commit against its OWN delivery function inside the same mutation that
 * writes the handle — and so the autosave/draft stream, which never calls this, schedules zero notifies.
 *
 * @param ctx - A mutation context with raw db access.
 * @param args - The publish's tenant id, target collection, and the cache tags it busts.
 * @returns Whether a delivery is already scheduled for this window plus the pending row's id.
 */
export async function coalescePending(
    ctx: MutationCtx,
    args: { tenantId: string; collection: string; tags: string[] },
): Promise<CoalesceResult> {
    const existing = await ctx.db
        .query('pendingRevalidations')
        .withIndex('by_tenant_collection', (q) => q.eq('tenantId', args.tenantId).eq('collection', args.collection))
        .unique();

    if (existing) {
        await ctx.db.patch('pendingRevalidations', existing._id, {
            tags: mergeTags(existing.tags, args.tags),
        });
        return { alreadyScheduled: existing.scheduledJobId !== undefined, pendingId: existing._id };
    }

    const pendingId = await ctx.db.insert('pendingRevalidations', {
        tenantId: args.tenantId,
        collection: args.collection,
        tags: mergeTags([], args.tags),
    });
    return { alreadyScheduled: false, pendingId };
}

/**
 * System-tier entry point for the dedup primitive: records an `eventId` once, returning whether the
 * write happened (a duplicate is a verified no-op). A thin wrapper over {@link recordEventOnce} that
 * gives the trusted write an `"internal"`-visibility function reference — callable from
 * crons/actions/other Convex functions, never the client. The publish path composes
 * {@link recordEventOnce} directly inside its own mutation.
 */
export const recordEvent = systemMutation({
    args: { eventId: v.string() },
    handler: (ctx, { eventId }) => recordEventOnce(ctx, eventId),
});

/**
 * System-tier entry point for the coalescing primitive: folds a publish into its (tenant, collection)
 * window and reports whether a delivery is already scheduled. A thin wrapper over
 * {@link coalescePending} that gives the merge an `"internal"`-visibility function reference; the
 * publish path composes {@link coalescePending} directly so it can arm and stamp the single delivery in
 * one mutation.
 */
export const coalesce = systemMutation({
    args: { tenantId: v.string(), collection: v.string(), tags: v.array(v.string()) },
    handler: (ctx, args) => coalescePending(ctx, args),
});
