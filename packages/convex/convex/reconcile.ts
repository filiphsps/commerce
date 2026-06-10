import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalAction } from './_generated/server';
import { reassembleShreddedFields, type ShreddedSideRow } from './cms/i18n_shred';
import { checksumDocument, rollupChecksum } from './lib/checksum';
import { collectWithinBudget } from './lib/scan_budget';
import { systemMutation, systemQuery } from './lib/system';

/**
 * The tables the in-Convex reconciliation sweep checksums, mirroring the script-side corpus built by
 * `scripts/etl/reconcile/checksum.ts` (the two lists MUST cover the same collections — the e2e parity
 * test pins this). `cmsDocuments` fans out into one ledger collection per CMS collection slug
 * (`cmsDocuments:<slug>`), with each document's shredded `cms_i18n` side rows folded back into the
 * logical document, so side rows are verified THROUGH their parents rather than as a standalone corpus.
 *
 * Deliberate exclusions (each verified elsewhere, never silently skipped):
 * - `shopCollaborators`: its `user` ref points into the auth family, which carries no stable
 *   cross-side identity (users have no `legacyId` and are not in the ETL export yet); the PIPELINE-03
 *   reference-integrity verifier covers the collaborator edges instead.
 * - `cmsVersions`: history snapshots are verified by the PIPELINE-02 versions transform suite and the
 *   PIPELINE-03 coverage verifier; the live-document corpus here is the cutover-blocking surface.
 */
export const RECONCILE_TABLES = [
    'shops',
    'shopCredentials',
    'shopDomains',
    'shopFeatureFlags',
    'featureFlags',
    'reviews',
    'cmsDocuments',
] as const;

/** One table of the reconciliation corpus. */
export type ReconcileTable = (typeof RECONCILE_TABLES)[number];

/**
 * Hard cap on a single checksum page. Each page reads at most this many parent rows (plus, for
 * `cmsDocuments`, each parent's per-parent-bounded side rows), keeping every `checksumPage` call far
 * under the engine's read ceilings regardless of the caller-supplied page size — the scan-budget
 * stance of `lib/scan_budget.ts` applied to a paginated sweep.
 */
export const RECONCILE_MAX_PAGE_SIZE = 512;

/** Default page size for the reconciliation sweep when the caller does not override it. */
export const RECONCILE_DEFAULT_PAGE_SIZE = 256;

/**
 * Upper bound on the per-side mismatch samples stored in a ledger row. The ledger stores SAMPLES of
 * the divergent per-document checksums (enough to locate offenders), never the full hash list.
 */
export const RECONCILE_SAMPLE_LIMIT = 16;

/** Per-document checksum tagged with the ledger collection it belongs to. */
type ChecksumEntry = { collection: string; hash: string };

/** Validator for one expected per-collection checksum the orchestrating action compares against. */
const expectedChecksumValidator = v.object({
    collection: v.string(),
    rollup: v.string(),
    count: v.number(),
    docHashes: v.optional(v.array(v.string())),
});

/**
 * Memoizing resolver mapping a referenced row's volatile Convex `_id` to its STABLE public identity
 * (`legacyId` — the inverse of the PIPELINE-01 id-remap, which derives surrogate ids from the same
 * source Mongo ids these columns preserve). A dangling reference resolves to a fixed
 * `missing:<table>` token so it deterministically diverges from any real identity instead of
 * throwing the sweep over.
 *
 * @param get - The raw `ctx.db.get` of the calling system query.
 * @returns An async resolver from `(shops | featureFlags)` row id to its `legacyId`.
 */
function makeLegacyIdResolver(get: (id: Id<'shops'> | Id<'featureFlags'>) => Promise<{ legacyId: string } | null>) {
    const memo = new Map<string, string>();
    return async (table: 'shops' | 'featureFlags', id: Id<'shops'> | Id<'featureFlags'>): Promise<string> => {
        const key = `${table}:${id}`;
        const cached = memo.get(key);
        if (cached !== undefined) return cached;
        const row = await get(id);
        const resolved = row ? row.legacyId : `missing:${table}`;
        memo.set(key, resolved);
        return resolved;
    };
}

/**
 * Strips Convex's volatile system fields off a stored row, leaving only content columns. `_id` and
 * `_creationTime` are deployment-issued (a re-import changes both), so they can never participate in
 * a cross-side checksum; the source-preserving `createdAt`/`updatedAt` columns stay.
 *
 * @param row - The stored row.
 * @returns The row's content fields.
 */
function stripVolatile<T extends { _id: unknown; _creationTime: number }>(row: T): Omit<T, '_id' | '_creationTime'> {
    const { _id, _creationTime, ...content } = row;
    return content;
}

/**
 * Computes the canonical checksums for ONE bounded page of one reconciliation table — the unit of
 * the sweep's batching. Page size is clamped to {@link RECONCILE_MAX_PAGE_SIZE}; `cmsDocuments`
 * parents additionally gather their `cms_i18n` side rows through the `by_parent_field` index under
 * the `lib/scan_budget.ts` collect budget (per-parent row counts are bounded by shreddable fields ×
 * locales, so the budget is defense-in-depth, not a working limit).
 *
 * Per-table logical document (the EXACT shape `scripts/etl/reconcile/checksum.ts` builds on the
 * expected side — both sides must canonicalize identical field maps):
 * - volatile `_id`/`_creationTime` stripped everywhere ({@link stripVolatile});
 * - id-reference columns (`shop`, `shopId`, `flag`) replaced by the referenced row's `legacyId`
 *   ({@link makeLegacyIdResolver});
 * - `cmsDocuments`: `latestVersionId` dropped (a volatile pointer into the separately-verified
 *   version history) and `data` replaced by the FULL reassembled field map — inline data plus every
 *   `cms_i18n` side row rehydrated through the runtime's own `reassembleShreddedFields`. The
 *   script-side expected corpus reassembles the SAME rows through the clean-room
 *   `independent-reassembly.ts` implementation, so a reassembly/shred transform bug surfaces as
 *   checksum divergence instead of two sides agreeing on the same wrong bytes.
 *
 * Read-only on content: a system-tier query that writes nothing.
 *
 * @returns The page's per-document checksum entries plus the pagination cursor state.
 */
export const checksumPage = systemQuery({
    args: {
        table: v.union(...RECONCILE_TABLES.map((table) => v.literal(table))),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (
        ctx,
        { table, paginationOpts },
    ): Promise<{ entries: ChecksumEntry[]; continueCursor: string; isDone: boolean }> => {
        const opts = {
            ...paginationOpts,
            numItems: Math.max(1, Math.min(paginationOpts.numItems, RECONCILE_MAX_PAGE_SIZE)),
        };
        const legacyIdOf = makeLegacyIdResolver((id) => ctx.db.get(id));
        const entries: ChecksumEntry[] = [];

        /**
         * Hashes one logical document into the page's entry list under `collection`.
         *
         * @param collection - The ledger collection key the document belongs to.
         * @param doc - The logical document to checksum.
         */
        const push = async (collection: string, doc: Record<string, unknown>): Promise<void> => {
            entries.push({ collection, hash: await checksumDocument(doc) });
        };

        switch (table) {
            case 'shops': {
                const page = await ctx.db.query('shops').paginate(opts);
                for (const row of page.page) await push(table, stripVolatile(row));
                return { entries, continueCursor: page.continueCursor, isDone: page.isDone };
            }
            case 'shopCredentials': {
                const page = await ctx.db.query('shopCredentials').paginate(opts);
                for (const row of page.page) {
                    await push(table, { ...stripVolatile(row), shop: await legacyIdOf('shops', row.shop) });
                }
                return { entries, continueCursor: page.continueCursor, isDone: page.isDone };
            }
            case 'shopDomains': {
                const page = await ctx.db.query('shopDomains').paginate(opts);
                for (const row of page.page) {
                    await push(table, { ...stripVolatile(row), shop: await legacyIdOf('shops', row.shop) });
                }
                return { entries, continueCursor: page.continueCursor, isDone: page.isDone };
            }
            case 'shopFeatureFlags': {
                const page = await ctx.db.query('shopFeatureFlags').paginate(opts);
                for (const row of page.page) {
                    await push(table, {
                        ...stripVolatile(row),
                        shop: await legacyIdOf('shops', row.shop),
                        flag: await legacyIdOf('featureFlags', row.flag),
                    });
                }
                return { entries, continueCursor: page.continueCursor, isDone: page.isDone };
            }
            case 'featureFlags': {
                const page = await ctx.db.query('featureFlags').paginate(opts);
                for (const row of page.page) await push(table, stripVolatile(row));
                return { entries, continueCursor: page.continueCursor, isDone: page.isDone };
            }
            case 'reviews': {
                const page = await ctx.db.query('reviews').paginate(opts);
                for (const row of page.page) {
                    await push(table, { ...stripVolatile(row), shopId: await legacyIdOf('shops', row.shopId) });
                }
                return { entries, continueCursor: page.continueCursor, isDone: page.isDone };
            }
            case 'cmsDocuments': {
                const page = await ctx.db.query('cmsDocuments').paginate(opts);
                for (const row of page.page) {
                    const { items } = await collectWithinBudget(
                        ctx.db.query('cms_i18n').withIndex('by_parent_field', (q) => q.eq('parentId', row._id)),
                    );
                    const sideRows: ShreddedSideRow[] = items.map((side: Doc<'cms_i18n'>) => ({
                        fieldPath: side.fieldPath,
                        locale: side.locale,
                        value: side.value,
                    }));
                    const { latestVersionId, ...content } = stripVolatile(row);
                    await push(`cmsDocuments:${row.collection}`, {
                        ...content,
                        shopId: await legacyIdOf('shops', row.shopId),
                        data: reassembleShreddedFields(row.data, sideRows),
                    });
                }
                return { entries, continueCursor: page.continueCursor, isDone: page.isDone };
            }
        }
    },
});

/**
 * Appends one (run, collection) parity verdict to the `reconciliationLedger` divergence ledger — the
 * ONLY write the reconciliation sweep performs (content tables are read-only throughout). System
 * tier: the ledger is platform-global migration infrastructure with no tenant context.
 *
 * @returns The inserted ledger row id.
 */
export const recordParity = systemMutation({
    args: {
        runId: v.string(),
        collection: v.string(),
        status: v.union(v.literal('match'), v.literal('mismatch')),
        expectedCount: v.number(),
        actualCount: v.number(),
        expectedRollup: v.string(),
        actualRollup: v.string(),
        expectedOnlySamples: v.array(v.string()),
        actualOnlySamples: v.array(v.string()),
    },
    handler: async (ctx, args): Promise<Id<'reconciliationLedger'>> => {
        return ctx.db.insert('reconciliationLedger', { ...args, recordedAt: Date.now() });
    },
});

/**
 * Reads one reconciliation run's full ledger through the `by_run` index, ordered by collection — the
 * queryable parity-gate surface (a run authorizes cutover iff every row is `match`). A run writes one
 * row per corpus collection, so the indexed collect is bounded by the corpus size, never by data volume.
 *
 * @returns The run's ledger rows sorted by `collection`.
 */
export const runLedger = systemQuery({
    args: { runId: v.string() },
    handler: async (ctx, { runId }): Promise<Doc<'reconciliationLedger'>[]> => {
        const rows = await ctx.db
            .query('reconciliationLedger')
            .withIndex('by_run', (q) => q.eq('runId', runId))
            .collect();
        return rows.sort((left, right) => (left.collection < right.collection ? -1 : 1));
    },
});

/**
 * The PIPELINE-04 reconciliation sweep: computes the Convex-side per-collection canonical checksums
 * over the FULL document set (paged through {@link checksumPage} in bounded batches — never one
 * unbounded collect), compares each collection's Merkle-ish rollup and count against the
 * script-side `expected` checksums (built by `scripts/etl/reconcile/checksum.ts` from the Mongo
 * export through the PIPELINE-01/02 transform), and writes one {@link recordParity} ledger row per
 * collection. A collection present on only one side is recorded as a `mismatch` against the empty
 * rollup, so a wholesale-missing corpus can never read as green.
 *
 * When an expected entry carries its per-document `docHashes`, the verdict row stores bounded
 * ({@link RECONCILE_SAMPLE_LIMIT}) samples of the hashes unique to each side, locating the divergent
 * documents without persisting the full lists.
 *
 * Runnable against an imported snapshot with NO live writes: every content read is a query, and the
 * single write target is the `reconciliationLedger` ledger itself. For THIS wave the action is proven
 * through `convex-test` against a seeded world (`reconcile.test.ts` drives seed → export-shape
 * fixtures → transform → both-side checksums); the run against the real imported backend happens at
 * the CUTOVER-01 dress rehearsal.
 *
 * @returns The run summary: how many collections were compared and how many mismatched.
 */
export const run = internalAction({
    args: {
        runId: v.string(),
        expected: v.array(expectedChecksumValidator),
        pageSize: v.optional(v.number()),
    },
    handler: async (ctx, { runId, expected, pageSize }): Promise<{ collections: number; mismatched: number }> => {
        const numItems = Math.max(1, Math.min(pageSize ?? RECONCILE_DEFAULT_PAGE_SIZE, RECONCILE_MAX_PAGE_SIZE));

        const actualHashes = new Map<string, string[]>();
        for (const table of RECONCILE_TABLES) {
            let cursor: string | null = null;
            let isDone = false;
            while (!isDone) {
                const page: { entries: ChecksumEntry[]; continueCursor: string; isDone: boolean } = await ctx.runQuery(
                    internal.reconcile.checksumPage,
                    {
                        table,
                        paginationOpts: { cursor, numItems },
                    },
                );
                for (const entry of page.entries) {
                    const bucket = actualHashes.get(entry.collection) ?? [];
                    bucket.push(entry.hash);
                    actualHashes.set(entry.collection, bucket);
                }
                cursor = page.continueCursor;
                isDone = page.isDone;
            }
        }

        const expectedByCollection = new Map(expected.map((entry) => [entry.collection, entry]));
        const collections = [...new Set([...expectedByCollection.keys(), ...actualHashes.keys()])].sort();

        let mismatched = 0;
        for (const collection of collections) {
            const hashes = actualHashes.get(collection) ?? [];
            const actualRollup = await rollupChecksum(hashes);
            const expectation = expectedByCollection.get(collection);
            const expectedRollup = expectation?.rollup ?? (await rollupChecksum([]));
            const expectedCount = expectation?.count ?? 0;
            const status = expectedRollup === actualRollup && expectedCount === hashes.length ? 'match' : 'mismatch';
            if (status === 'mismatch') mismatched += 1;

            let expectedOnlySamples: string[] = [];
            let actualOnlySamples: string[] = [];
            if (status === 'mismatch' && expectation?.docHashes) {
                const expectedSet = new Set(expectation.docHashes);
                const actualSet = new Set(hashes);
                expectedOnlySamples = expectation.docHashes
                    .filter((hash) => !actualSet.has(hash))
                    .sort()
                    .slice(0, RECONCILE_SAMPLE_LIMIT);
                actualOnlySamples = hashes
                    .filter((hash) => !expectedSet.has(hash))
                    .sort()
                    .slice(0, RECONCILE_SAMPLE_LIMIT);
            }

            await ctx.runMutation(internal.reconcile.recordParity, {
                runId,
                collection,
                status,
                expectedCount,
                actualCount: hashes.length,
                expectedRollup,
                actualRollup,
                expectedOnlySamples,
                actualOnlySamples,
            });
        }

        return { collections: collections.length, mismatched };
    },
});
