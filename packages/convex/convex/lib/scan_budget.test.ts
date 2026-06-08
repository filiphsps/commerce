import { ConvexError } from 'convex/values';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import type { Id } from '../_generated/dataModel';
import schema from '../schema';
import { BoundedScanExceededError, collectWithinBudget, countWithinBudget, ScanBudgetErrorCode } from './scan_budget';

/**
 * A fixed epoch-ms stamp for seeded rows' managed timestamps; its value only has to satisfy the
 * numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Module map for `convex-test`: this suite exercises pure helpers through the raw `t.run` ctx, so only
 * the `_generated` anchor (convex-test's `/convex/` module-root detection) is needed.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
};

/**
 * Wraps an array in an async iterable, standing in for a Convex query's streaming surface so the
 * budget logic can be exercised without seeding rows.
 *
 * @param items - The values to yield in order.
 * @returns An async generator over `items`.
 */
async function* asyncOf<T>(items: readonly T[]): AsyncGenerator<T> {
    for (const item of items) yield item;
}

/**
 * Seeds one shop and `count` `cmsDocuments` rows for it through the raw `t.run` ctx (the unscoped path
 * for direct table inserts), returning the shop id so the scan can target its indexed range.
 *
 * @param t - The convex-test harness.
 * @param count - How many `cmsDocuments` rows to insert under the seeded shop.
 * @returns The seeded `shops` id.
 */
async function seedDocs(t: ReturnType<typeof convexTest>, count: number): Promise<Id<'shops'>> {
    return t.run(async (ctx) => {
        const shopId = await ctx.db.insert('shops', {
            legacyId: 'shop_scan',
            name: 'shop_scan',
            domain: 'shop_scan.example.com',
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'shop_scan' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        });
        for (let i = 0; i < count; i += 1) {
            await ctx.db.insert('cmsDocuments', {
                shopId,
                collection: 'pages',
                data: { title: `doc ${i}`, slug: `doc-${i}` },
                status: 'draft',
                createdAt: NOW,
                updatedAt: NOW,
            });
        }
        return shopId;
    });
}

describe('scan budget', () => {
    it('countWithinBudget returns the exact count when the source fits within budget', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedDocs(t, 12);

        const total = await t.run((ctx) =>
            countWithinBudget(ctx.db.query('cmsDocuments').filter((q) => q.eq(q.field('shopId'), shopId))),
        );

        expect(total).toBe(12);
    });

    it('countWithinBudget aborts a tenant scan past the ceiling with BoundedScanExceededError', async () => {
        const t = convexTest(schema, modules);
        const shopId = await seedDocs(t, 12);

        const error = await t
            .run((ctx) =>
                countWithinBudget(
                    ctx.db.query('cmsDocuments').filter((q) => q.eq(q.field('shopId'), shopId)),
                    {
                        documentBudget: 5,
                    },
                ),
            )
            .catch((caught: unknown) => caught);

        // Across the t.run boundary the subclass may be reconstructed as a plain ConvexError, so the
        // stable `data.code` — not `instanceof` — is the contract under test (a silent truncation
        // would instead resolve to a number).
        expect(error).toBeInstanceOf(ConvexError);
        expect((error as ConvexError<{ code: string }>).data.code).toBe(ScanBudgetErrorCode.BOUNDED_SCAN_EXCEEDED);
    });

    it('collectWithinBudget returns every in-budget item with its totals', async () => {
        const { items, scanned } = await collectWithinBudget(asyncOf([1, 2, 3]));
        expect(items).toEqual([1, 2, 3]);
        expect(scanned).toBe(3);
    });

    it('collectWithinBudget trips the byte ceiling before the document ceiling', async () => {
        const big = { blob: 'x'.repeat(1000) };
        const error = await collectWithinBudget(asyncOf([big, big, big, big, big]), {
            documentBudget: 1_000,
            byteBudget: 2_500,
        }).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(BoundedScanExceededError);
        expect((error as BoundedScanExceededError).data.code).toBe(ScanBudgetErrorCode.BOUNDED_SCAN_EXCEEDED);
        expect((error as BoundedScanExceededError).data.bytes).toBeGreaterThanOrEqual(2_500);
    });
});
