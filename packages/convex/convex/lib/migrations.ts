import type { DocumentByName, TableNamesInDataModel } from 'convex/server';
import { makeFunctionReference } from 'convex/server';
import { ConvexError, v } from 'convex/values';

import type { DataModel, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { internalMutation } from '../_generated/server';

/**
 * Default page size for a backfill batch. Sized to stay comfortably under Convex's per-mutation
 * read/write bandwidth ceiling while keeping the number of recursively-scheduled batches low for a
 * full-table sweep. Override per backfill via {@link makeBackfill}'s `batchSize` or per run via the
 * `batchSize` argument.
 */
export const BACKFILL_BATCH_SIZE = 100;

/**
 * Stable string codes carried on every {@link ConvexError} this module throws, so call sites and
 * `convex-test` can branch on the failure cause without string-matching messages. Backfills run in the
 * Convex isolate (not Node), where `@nordcom/commerce-errors` is not on the bundle's dependency
 * surface, so a local `ConvexError` payload is the sanctioned in-runtime error contract — matching the
 * convention `lib/auth.ts` already established.
 */
export const BackfillErrorCode = {
    /** A non-positive `batchSize` was supplied; pagination cannot make progress with an empty page. */
    INVALID_BATCH_SIZE: 'INVALID_BATCH_SIZE',
} as const;

/**
 * Arguments accepted by every backfill mutation produced by {@link makeBackfill}.
 *
 * `fn` is the backfill's OWN function reference path (e.g. `lib/migrations:backfillFoo`). It is how a
 * batch reschedules the next one — a registered Convex mutation cannot reference itself at module load,
 * so the caller threads the name through (the same indirection `convex-helpers/server/migrations`
 * uses). Omit it to run exactly ONE batch and return its cursor for the caller to drive pagination by
 * hand; supply it to auto-sweep the whole table across recursively-scheduled batches.
 */
export const backfillArgs = {
    fn: v.optional(v.string()),
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
};

/**
 * Outcome of a single backfill batch.
 *
 * @property processed - Rows examined in this batch (the page length).
 * @property migrated - Rows actually patched in this batch — rows the transform reported as already
 *   migrated (a falsy / empty return) are counted in `processed` but NOT here, so a re-run over a
 *   fully-migrated table reports `migrated: 0` (the idempotent no-op signal).
 * @property isDone - `true` when this was the final page (no further rows remain).
 * @property cursor - The continuation cursor to resume from; pass it back as `cursor` for the next batch.
 */
export type BackfillBatchResult = {
    processed: number;
    migrated: number;
    isDone: boolean;
    cursor: string | null;
};

/**
 * Per-row transform for a backfill. Receives one document and returns the partial patch to apply, or a
 * falsy / empty value to leave the row UNTOUCHED. Idempotency is the transform's contract: it MUST
 * detect an already-migrated row (e.g. the new field is already populated) and return nothing, so that
 * re-running the backfill is a verified no-op. The transform runs inside the backfill mutation's
 * transaction, so it may read related rows off `ctx.db`.
 */
type MigrateOne<Table extends TableNamesInDataModel<DataModel>> = (
    ctx: MutationCtx,
    doc: DocumentByName<DataModel, Table>,
) =>
    | Partial<DocumentByName<DataModel, Table>>
    | undefined
    | Promise<Partial<DocumentByName<DataModel, Table>> | undefined>;

/**
 * Builds a generic, paginating, idempotent backfill mutation over one table — the data half of an
 * expand → backfill → contract schema evolution (add the new field optional, backfill it on every live
 * row, then tighten the validator once no row violates it). Modeled on
 * `convex-helpers/server/migrations` but deliberately STATELESS: it persists no migration-state table
 * (this codebase's schema is closed to new tables), so idempotency comes entirely from the transform
 * skipping already-migrated rows rather than from a stored cursor/`isDone` flag.
 *
 * Each invocation paginates ONE batch off the table, applies {@link MigrateOne} to every row in the
 * page, and patches only the rows the transform asked to change. When `args.fn` is supplied and rows
 * remain, it reschedules itself (via `ctx.scheduler.runAfter(0, …)`) with the continuation cursor to
 * sweep the whole table; with `args.fn` omitted it runs a single batch and returns the cursor for the
 * caller to drive pagination manually (the path the test and a cautious operator use).
 *
 * @param config - The target table, the per-row transform, and an optional default page size.
 * @param config.table - The table to sweep.
 * @param config.migrateOne - The idempotent per-row transform (see {@link MigrateOne}).
 * @param config.batchSize - Default page size for this backfill; falls back to {@link BACKFILL_BATCH_SIZE}.
 * @returns An `internal`-visibility mutation (server-callable only) that runs one batch and reports
 *   {@link BackfillBatchResult}.
 */
export function makeBackfill<Table extends TableNamesInDataModel<DataModel>>(config: {
    table: Table;
    migrateOne: MigrateOne<Table>;
    batchSize?: number;
}) {
    const defaultBatchSize = config.batchSize ?? BACKFILL_BATCH_SIZE;
    return internalMutation({
        args: backfillArgs,
        handler: async (ctx, args): Promise<BackfillBatchResult> => {
            const numItems = args.batchSize ?? defaultBatchSize;
            if (numItems <= 0) {
                throw new ConvexError({ code: BackfillErrorCode.INVALID_BATCH_SIZE, batchSize: numItems });
            }

            const { page, continueCursor, isDone } = await ctx.db
                .query(config.table)
                .paginate({ cursor: args.cursor ?? null, numItems });

            let migrated = 0;
            for (const doc of page) {
                const patch = await config.migrateOne(ctx, doc);
                if (patch && Object.keys(patch).length > 0) {
                    // The 3-arg `patch(table, id, value)` form pins the patch to `config.table`. The
                    // generic table name defeats the per-table overload's id inference, so `doc._id`
                    // (typed as the union of every table's id) is narrowed back to this table's id.
                    await ctx.db.patch(config.table, doc._id as Id<Table>, patch);
                    migrated += 1;
                }
            }

            if (!isDone && args.fn !== undefined) {
                await ctx.scheduler.runAfter(0, makeFunctionReference<'mutation'>(args.fn), {
                    ...args,
                    cursor: continueCursor,
                });
            }

            return { processed: page.length, migrated, isDone, cursor: continueCursor };
        },
    });
}
