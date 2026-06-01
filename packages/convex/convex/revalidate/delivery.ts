import { ActionRetrier, type RunId, runIdValidator, runResultValidator } from '@convex-dev/action-retrier';
import type { FunctionReference } from 'convex/server';
import { type Infer, v } from 'convex/values';

import { components, internal } from '../_generated/api';
import { internalAction, internalMutation } from '../_generated/server';
import { systemMutation } from '../lib/system';

/**
 * The retrier's `onComplete` contract requires the callback reference to carry the package's branded
 * `RunId` for its `runId` argument, but Convex codegen renders that brand as a plain `string` in the
 * generated function reference — only Convex-native `Id` brands survive codegen. This alias restores the
 * brand for the single cast in {@link enqueueDelivery}; the runtime value handed to the callback is a
 * genuine `RunId`, so the cast only re-narrows a type codegen could not preserve.
 */
type OnDeliveryCompleteRef = FunctionReference<
    'mutation',
    'internal',
    { runId: RunId; result: Infer<typeof runResultValidator> }
>;

/**
 * Bounded exponential-backoff policy for revalidation delivery (BRIDGE-07). A delivery is attempted
 * once, then retried after `initialBackoffMs * base^attempt` (jittered by the retrier) up to
 * `maxFailures` further times — so a run makes at most `maxFailures + 1` total executions before it is
 * dead-lettered. The bound is the whole point: a poison target (a tenant whose storefront keeps
 * answering non-2xx) must NOT retry forever, or it would pin a scheduler slot and starve healthy
 * deliveries. The values are deliberately conservative — a 1s base doubling to ~32s by the final attempt
 * — covering a transient storefront restart/deploy window without hammering a hard-down host.
 *
 * Exported so the delivery contract is assertable in tests rather than buried in the retrier construction.
 */
export const DELIVERY_RETRY_OPTIONS = {
    initialBackoffMs: 1000,
    base: 2,
    maxFailures: 5,
} as const;

/**
 * The action-retrier client bound to the registered `actionRetrier` component (see `convex.config.ts`),
 * pre-configured with {@link DELIVERY_RETRY_OPTIONS}. Module-scoped so every delivery shares one policy.
 */
const retrier = new ActionRetrier(components.actionRetrier, DELIVERY_RETRY_OPTIONS);

/**
 * Durable entry point for delivering a coalesced revalidation window: schedules `revalidate/notify`
 * under the action-retrier so a transient non-2xx storefront response is retried with bounded
 * exponential backoff instead of dropping the cache bust. Replaces a bare `scheduler.runAfter(notify)` —
 * the publish path (BRIDGE-05) arms a window's single delivery through this function. A context row is
 * recorded against the retrier `runId` so {@link onDeliveryComplete} can dead-letter with the full
 * delivery context if every attempt is exhausted (the retrier's `onComplete` callback is handed only the
 * `runId`, never the action's arguments). The context insert and `retrier.run` commit in the same
 * mutation transaction, so the row is always present before any scheduled attempt — let alone the
 * terminal callback — can run.
 *
 * No-ops when the pending row is already gone (a prior window's delivery already acked and drained it),
 * so a stale re-arm does not enqueue a delivery against a vanished window.
 *
 * @param pendingId - The pending coalescing row to deliver.
 * @returns Resolves once the retrier run is scheduled and its context row recorded.
 */
export const enqueueDelivery = systemMutation({
    args: { pendingId: v.id('pendingRevalidations') },
    handler: async (ctx, { pendingId }): Promise<void> => {
        const pending = await ctx.db.get('pendingRevalidations', pendingId);
        if (!pending) {
            return;
        }

        const runId = await retrier.run(
            ctx,
            internal.revalidate.notify.notify,
            { pendingId },
            { onComplete: internal.revalidate.delivery.onDeliveryComplete as OnDeliveryCompleteRef },
        );

        await ctx.db.insert('revalidationDeliveries', {
            runId,
            pendingId,
            tenantId: pending.tenantId,
            collection: pending.collection,
            tags: pending.tags,
        });
    },
});

/**
 * Terminal callback the action-retrier invokes exactly once when a delivery run completes — succeeded,
 * exhausted, or canceled (BRIDGE-07). On a `failed` terminal state (every attempt exhausted without a
 * 2xx ack) it dead-letters the delivery: it writes ONE `revalidationDeadLetters` row from the snapshot
 * held in the run's context row, drops the poison `pendingRevalidations` row (it can never deliver, so
 * leaving it would coalesce future publishes into a dead window), and fires the operator alert via
 * {@link emitDeadLetterAlert}. On any terminal state the context row is deleted so the in-flight ledger
 * holds only live runs. A run whose context row is already gone (a duplicate/late callback) is a
 * verified no-op, keeping the dead-letter write idempotent.
 *
 * Built on the raw `internalMutation` rather than `systemMutation`: it is an internal callback the
 * retrier invokes server-side (never reachable from the client) and writes bridge-global infrastructure
 * with no tenant context, so it belongs to the same no-RLS exemption class as the rest of this module.
 * It cannot route through `systemMutation` because that wrapper widens the `RunId`-branded `runId`
 * validator to a plain `string`, which would break the retrier's branded `onComplete` contract.
 *
 * @param runId - The action-retrier run handle that completed.
 * @param result - The run's terminal result; `failed` carries the last attempt's error message.
 * @returns Resolves once the dead-letter row, alert, and context cleanup are applied.
 */
export const onDeliveryComplete = internalMutation({
    args: { runId: runIdValidator, result: runResultValidator },
    handler: async (ctx, { runId, result }): Promise<void> => {
        const delivery = await ctx.db
            .query('revalidationDeliveries')
            .withIndex('by_run_id', (q) => q.eq('runId', runId))
            .unique();
        if (!delivery) {
            return;
        }

        if (result.type === 'failed') {
            await ctx.db.insert('revalidationDeadLetters', {
                pendingId: delivery.pendingId,
                tenantId: delivery.tenantId,
                collection: delivery.collection,
                tags: delivery.tags,
                error: result.error,
                runId,
                deadLetteredAt: Date.now(),
            });

            const poison = await ctx.db.get('pendingRevalidations', delivery.pendingId);
            if (poison) {
                await ctx.db.delete('pendingRevalidations', delivery.pendingId);
            }

            await ctx.scheduler.runAfter(0, internal.revalidate.delivery.emitDeadLetterAlert, {
                tenantId: delivery.tenantId,
                collection: delivery.collection,
                error: result.error,
                runId,
            });
        }

        await ctx.db.delete('revalidationDeliveries', delivery._id);
    },
});

/**
 * Operator alert hook for an exhausted revalidation delivery (BRIDGE-07). Reaching this means a tenant's
 * cache bust was permanently lost — the storefront kept answering non-2xx through every retry — so its
 * cached CMS content is now stale until the next publish. Emitted as an internal action (not inline in
 * {@link onDeliveryComplete}) so it owns the I/O seam where a future PagerDuty/Slack/webhook POST plugs
 * in without re-entering a mutation; today it logs a structured, alert-routable line. Fire-and-forget:
 * scheduled by {@link onDeliveryComplete} so a downstream alert failure never blocks dead-lettering.
 *
 * @param tenantId - The tenant whose delivery was dead-lettered.
 * @param collection - The CMS collection whose bust was lost.
 * @param error - The terminal failure message from the final attempt.
 * @param runId - The action-retrier run handle, for cross-referencing the dead-letter row.
 * @returns Resolves once the alert has been emitted.
 */
export const emitDeadLetterAlert = internalAction({
    args: { tenantId: v.string(), collection: v.string(), error: v.string(), runId: v.string() },
    handler: (...[, { tenantId, collection, error, runId }]): Promise<void> => {
        console.error('[commerce-convex] revalidation delivery dead-lettered', {
            tenantId,
            collection,
            error,
            runId,
        });
        return Promise.resolve();
    },
});
