import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../schema';
import { type BackfillBatchResult, makeBackfill } from './migrations';

/**
 * A backfill that normalizes a review's `updatedAt` to its `createdAt` ONLY when `updatedAt` is the
 * sentinel `0` — exactly the expand → backfill → contract shape (populate a stale/placeholder value on
 * every live row). Its idempotency contract: a row whose `updatedAt` is no longer `0` is already
 * migrated, so the transform returns `undefined` and the row is left untouched, making a re-run a
 * verified no-op. A small `batchSize` is supplied per run (not here) to force multiple pages over the
 * seeded rows, exercising the cursor pagination. The real {@link makeBackfill} constructor is the code
 * under test.
 */
const backfillReviewTimestamps = makeBackfill({
    table: 'reviews',
    migrateOne: (...[, doc]) => (doc.updatedAt === 0 ? { updatedAt: doc.createdAt } : undefined),
});

/**
 * convex-test resolves functions through a module map. Biome forbids exporting fixtures from a test
 * file (`noExportsInTest`) and the default glob excludes the self-importing module, so the map is
 * hand-built here, mapping this module's path to the (non-exported) backfill above so it resolves by
 * `FunctionReference`. The dummy `_generated` key carries no functions; it exists only so convex-test
 * can derive the shared `/convex/` module-root prefix. (Mirrors `lib/system.test.ts`.)
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/lib/migrations.test.ts': () => Promise.resolve({ backfillReviewTimestamps }),
};

const backfillRef = makeFunctionReference<
    'mutation',
    { fn?: string; cursor?: string | null; batchSize?: number },
    BackfillBatchResult
>('lib/migrations.test:backfillReviewTimestamps');

/**
 * Drives the backfill batch-by-batch via the returned continuation cursor (the `fn`-omitted manual
 * pagination path), tallying how many rows were patched and how many batches it took, until the final
 * page reports `isDone`. `runOne` decouples the loop from the concrete convex-test handle type.
 *
 * @param runOne - Runs a single backfill batch from the given cursor.
 * @returns The total rows migrated and the number of batches the sweep took.
 */
async function runBackfillToCompletion(
    runOne: (cursor: string | null) => Promise<BackfillBatchResult>,
): Promise<{ migrated: number; batches: number }> {
    let cursor: string | null = null;
    let isDone = false;
    let migrated = 0;
    let batches = 0;
    while (!isDone) {
        const result = await runOne(cursor);
        migrated += result.migrated;
        cursor = result.cursor;
        isDone = result.isDone;
        batches += 1;
    }
    return { migrated, batches };
}

describe('makeBackfill', () => {
    it('paginates the table and applies the transform idempotently (re-run is a no-op)', async () => {
        const t = convexTest(schema, modules);

        // Seed one shop and five reviews carrying the sentinel `updatedAt: 0`.
        const reviewCount = 5;
        await t.run(async (ctx) => {
            const now = 1_700_000_000_000;
            const shopId = await ctx.db.insert('shops', {
                legacyId: 'shop_backfill',
                name: 'Backfill',
                domain: 'backfill.example.com',
                design: {
                    header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Backfill' } },
                    accents: [],
                },
                commerceProvider: { type: 'stripe', authentication: {} },
                createdAt: now,
                updatedAt: now,
            });
            for (let i = 0; i < reviewCount; i += 1) {
                await ctx.db.insert('reviews', { shopId, createdAt: now + i, updatedAt: 0 });
            }
        });

        // First sweep: a batchSize below the row count forces multiple pages (proves pagination).
        const runOne = (cursor: string | null) => t.mutation(backfillRef, { batchSize: 2, cursor });
        const first = await runBackfillToCompletion(runOne);
        expect(first.batches).toBeGreaterThan(1);
        expect(first.migrated).toBe(reviewCount);

        const afterFirst = await t.run((ctx) => ctx.db.query('reviews').collect());
        expect(afterFirst).toHaveLength(reviewCount);
        // Every row's sentinel was replaced by its createdAt; none left at 0.
        expect(afterFirst.every((review) => review.updatedAt === review.createdAt)).toBe(true);

        // Second sweep over the now-migrated table: the transform skips every row, so zero patches.
        const second = await runBackfillToCompletion(runOne);
        expect(second.migrated).toBe(0);

        // The data is byte-for-byte unchanged by the re-run.
        const afterSecond = await t.run((ctx) => ctx.db.query('reviews').collect());
        expect(afterSecond).toEqual(afterFirst);
    });

    it('rejects a non-positive batch size so pagination cannot stall', async () => {
        const t = convexTest(schema, modules);
        await expect(t.mutation(backfillRef, { batchSize: 0, cursor: null })).rejects.toThrow(/INVALID_BATCH_SIZE/);
    });
});
