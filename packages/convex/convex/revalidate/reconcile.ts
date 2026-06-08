import { v } from 'convex/values';

import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { internalAction } from '../_generated/server';
import { systemQuery } from '../lib/system';

/**
 * Throttle/staleness policy for the reconciliation cron (BRIDGE-08). Reconciliation is a low-frequency
 * self-healing sweep for permanently-lost revalidation events — a publish that coalesced a window but
 * whose durable delivery never fired (a crash between coalesce and arming, a scheduler drop) — NOT a
 * second copy of the live delivery path. Both bounds keep it from broad-sweeping or fighting healthy
 * deliveries:
 *
 * - `staleAfterMs` is the minimum age an unacked window must reach before it is presumed lost. It MUST
 *   exceed the live coalesce→deliver→ack window plus the action-retrier's bounded backoff tail
 *   (`DELIVERY_RETRY_OPTIONS`), so a window still inside its normal delivery/retry lifecycle is
 *   never replayed by the cron. A pending row's `_creationTime` is its per-window cursor: it is the
 *   instant the window became unacked-since-the-last-successful-POST (an ack DELETES the row, so a fresh
 *   publish always starts a new row with a fresh `_creationTime`), and its age is measured against this
 *   bound.
 * - `maxPerPass` hard-caps how many lost windows a single pass replays, bounding the cron's scheduler /
 *   fetch fan-out so a large backlog drains across several passes instead of stampeding in one — the
 *   rate limit.
 *
 * Exported so the reconciliation contract is assertable in tests rather than buried in the cron body.
 */
export const RECONCILE_THROTTLE = {
    staleAfterMs: 15 * 60 * 1000,
    maxPerPass: 50,
} as const;

/**
 * Selects the lost revalidation windows a single reconciliation pass should replay: pending (unacked)
 * coalescing rows older than `now - staleAfterMs` that have NO in-flight retrier delivery, capped at
 * `limit`. This is what makes reconciliation cursor-scoped rather than a global full-revalidate:
 *
 * - A row newer than the cutoff is still inside its live delivery window and is skipped, so a healthy
 *   in-progress publish is never re-delivered.
 * - A row with a live `revalidationDeliveries` entry is already being delivered by the action-retrier,
 *   so it is skipped too — reconciliation only adopts windows the durable path has genuinely lost (no
 *   live run, aged past the bound), never windows it is actively handling.
 *
 * Clean-cursor tenants (no unacked rows) contribute nothing and are therefore implicitly skipped. Runs
 * on the system tier (no RLS) because the bridge spans tenants with no tenant context.
 *
 * @param now - Current time in epoch milliseconds (injected from the action so the cutoff is deterministic under test).
 * @param staleAfterMs - Minimum unacked age before a window is presumed lost.
 * @param limit - Maximum number of lost windows to return — the per-pass rate limit.
 * @returns The ids of the lost pending windows to replay, at most `limit` of them.
 */
export const listLostWindows = systemQuery({
    args: { now: v.number(), staleAfterMs: v.number(), limit: v.number() },
    handler: async (ctx, { now, staleAfterMs, limit }): Promise<Array<Id<'pendingRevalidations'>>> => {
        const cutoff = now - staleAfterMs;

        const inflight = new Set<Id<'pendingRevalidations'>>();
        for (const delivery of await ctx.db.query('revalidationDeliveries').collect()) {
            inflight.add(delivery.pendingId);
        }

        const lost: Array<Id<'pendingRevalidations'>> = [];
        for (const window of await ctx.db.query('pendingRevalidations').collect()) {
            if (window._creationTime > cutoff) {
                continue;
            }
            if (inflight.has(window._id)) {
                continue;
            }
            lost.push(window._id);
            if (lost.length >= limit) {
                break;
            }
        }
        return lost;
    },
});

/**
 * Low-frequency reconciliation pass (BRIDGE-08) that self-heals permanently-lost revalidation events.
 * Selects the lost windows for this pass via {@link listLostWindows} (cursor-scoped and rate-limited by
 * {@link RECONCILE_THROTTLE}), then replays each through the BRIDGE-07 durable delivery path
 * (`enqueueDelivery`) — the SAME notify/retrier route the live publish path uses, so a replay is
 * idempotent: a window already acked-and-drained is a verified no-op (its pending row is gone, so
 * `enqueueDelivery` does nothing), and a successful replay clears the window so the next pass skips it.
 *
 * Registered as a singleton cron (see `crons.ts`); it deliberately does NOT broad-sweep every
 * tag/tenant — clean-cursor tenants and in-window/in-flight windows are excluded by the selection query.
 *
 * @returns Resolves once every selected lost window has been re-enqueued for delivery.
 */
export const reconcile = internalAction({
    args: {},
    handler: async (ctx): Promise<void> => {
        const lost = await ctx.runQuery(internal.revalidate.reconcile.listLostWindows, {
            now: Date.now(),
            staleAfterMs: RECONCILE_THROTTLE.staleAfterMs,
            limit: RECONCILE_THROTTLE.maxPerPass,
        });

        for (const pendingId of lost) {
            await ctx.runMutation(internal.revalidate.delivery.enqueueDelivery, { pendingId });
        }
    },
});
