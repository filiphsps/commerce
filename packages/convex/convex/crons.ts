import { cronJobs } from 'convex/server';

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

/**
 * STUB — destination wiring is a follow-up. Trigger point for a daily snapshot export of the
 * self-hosted Convex deployment. A full export to an off-box destination (S3/GCS/etc.) is produced
 * by the `convex export` admin operation, which is NOT callable from inside a Convex function and
 * needs object-storage credentials this deployment does not yet provision. This action exists so the
 * schedule below references a real, deployed function and the cron is visible after deploy; replace
 * the body with the actual export-and-upload trigger once the destination bucket and credentials are
 * provisioned (tracked as follow-up to CONVEXCORE-02).
 *
 * @returns Resolves once the placeholder run has logged. No data is moved yet.
 */
export const exportSnapshot = internalAction({
    args: {},
    handler: async () => {
        console.info(
            '[commerce-convex] export-snapshot cron fired; destination wiring pending (CONVEXCORE-02 follow-up).',
        );
    },
});

/**
 * Registered Convex cron schedule for `@nordcom/commerce-convex`. Convex crons schedule internal
 * functions (not CLI commands), so the daily snapshot export is wired through
 * {@link exportSnapshot}. Runs once per day at 08:00 UTC — an off-peak window for the storefront's
 * primary traffic regions — keeping the schedule real and visible in the deployment after `convex
 * deploy`.
 */
const crons = cronJobs();

crons.daily('export-snapshot', { hourUTC: 8, minuteUTC: 0 }, internal.crons.exportSnapshot, {});

/**
 * Low-frequency reconciliation pass for the Convex→Next revalidation bridge (BRIDGE-08). Self-heals
 * permanently-lost revalidation events — windows that coalesced but whose durable delivery never fired —
 * by replaying ONLY the unacked-since-cursor windows aged past the staleness bound through the existing
 * notify/retrier path (see `revalidate/reconcile.ts`). Scheduled hourly rather than at the bridge's
 * sub-second live cadence on purpose: it is a backstop for the rare lost event, not the primary delivery
 * path, and its per-pass fan-out is rate-limited so a backlog drains across passes. Runs at minute 30 to
 * sit off the top-of-hour where other scheduled work clusters.
 */
crons.hourly('revalidation-reconcile', { minuteUTC: 30 }, internal.revalidate.reconcile.reconcile, {});

export default crons;
