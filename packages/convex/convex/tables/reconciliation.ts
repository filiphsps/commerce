import { defineTable } from 'convex/server';
import { type Infer, v } from 'convex/values';

/**
 * Parity verdict for one (run, collection) pair. `match` means the Convex-side rollup checksum AND
 * document count equal the expected (Mongo→transform) side; anything else — rollup drift, count
 * drift, or a collection present on only one side — is `mismatch`.
 */
export const reconciliationStatusValidator = v.union(v.literal('match'), v.literal('mismatch'));

/**
 * Stored row for the PIPELINE-04 reconciliation divergence ledger: exactly one row per collection
 * per reconciliation run, written by `convex/reconcile.ts`'s `recordParity` after the run's bounded
 * checksum sweep. The ledger is the queryable parity gate authorizing cutover — a run is green iff
 * every one of its rows is `match` — and, like the SFREAD-12 `cmsReadDivergence` ledger, it is a
 * Convex table (not a log line) so the verdict survives redeploys and reads as a plain indexed query.
 *
 * `runId` is the caller-chosen opaque run identifier (one reconciliation sweep). `collection` is the
 * logical corpus key: a core table name (`shops`, `reviews`, …) or `cmsDocuments:<slug>` for the
 * per-CMS-collection document corpora. `expectedRollup`/`expectedCount` come from the script-side
 * transform of the Mongo export; `actualRollup`/`actualCount` from the in-Convex sweep. The
 * `*OnlySamples` fields hold BOUNDED samples (never the full list) of per-document checksums present
 * on only one side, so a single divergent document is locatable without storing every hash.
 */
export const reconciliationLedgerValidator = v.object({
    runId: v.string(),
    collection: v.string(),
    status: reconciliationStatusValidator,
    expectedCount: v.number(),
    actualCount: v.number(),
    expectedRollup: v.string(),
    actualRollup: v.string(),
    expectedOnlySamples: v.array(v.string()),
    actualOnlySamples: v.array(v.string()),
    recordedAt: v.number(),
});

/**
 * Inferred row shape for one reconciliation ledger entry. See {@link reconciliationLedgerValidator}.
 */
export type ReconciliationLedgerEntry = Infer<typeof reconciliationLedgerValidator>;

/**
 * The reconciliation ledger table group. Platform-global migration infrastructure written ONLY
 * through the system tier (`convex/reconcile.ts`), so it joins `coreTables` and stays under
 * `lib/rls.ts`'s deny-everything base rule at the tenant tier — born denied, like every
 * non-tenant table. `by_run` reads one run's full verdict; `by_collection` reads one collection's
 * verdict history across runs.
 */
export const reconciliationTables = {
    reconciliationLedger: defineTable(reconciliationLedgerValidator)
        .index('by_run', ['runId'])
        .index('by_collection', ['collection']),
};
