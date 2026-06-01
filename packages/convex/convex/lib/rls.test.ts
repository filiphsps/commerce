import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../schema';
import { wrapTenantDatabaseReader, wrapTenantDatabaseWriter } from './rls';

/**
 * A fixed epoch-ms stamp for the seeded rows' managed `createdAt`/`updatedAt` fields. The exact value is
 * irrelevant to the RLS assertions; it only has to satisfy the required numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * convex-test derives its module root from a Vite `import.meta.glob`, which is unavailable in this
 * runtime, so a minimal map is supplied instead. These tests drive the wrapped db entirely through
 * `t.run` (which executes its closure directly and resolves NO `FunctionReference`), so the map needs
 * only the `_generated` key convex-test uses to detect the shared `/convex/` module-root prefix.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
};

/**
 * Builds the required-field payload for a seed `shops` row under a given legacy id and domain, mirroring
 * the minimal shape `shopValidator` demands (a Stripe provider carries no split-out credential). Used to
 * stand up two distinct tenants so the cross-tenant denial assertions have real `shops` `_id`s to scope.
 *
 * @param legacyId - The source-id string for the row's `legacyId`.
 * @param domain - The row's primary domain.
 * @returns A `shops` insert payload satisfying `shopValidator`.
 */
function shopSeed(legacyId: string, domain: string) {
    return {
        legacyId,
        name: legacyId,
        domain,
        design: {
            header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: legacyId } },
            accents: [],
        },
        commerceProvider: { type: 'stripe' as const, authentication: {} },
        createdAt: NOW,
        updatedAt: NOW,
    };
}

describe('tenant RLS (tenantRules + wrapped reader/writer, deny default)', () => {
    it('range-bounds a tenant read to its own shop and denies cross-tenant rows', async () => {
        const t = convexTest(schema, modules);

        const result = await t.run(async (ctx) => {
            const shopAId = await ctx.db.insert('shops', shopSeed('shop_a', 'a.example.com'));
            const shopBId = await ctx.db.insert('shops', shopSeed('shop_b', 'b.example.com'));
            const reviewAId = await ctx.db.insert('reviews', { shopId: shopAId, createdAt: NOW, updatedAt: NOW });

            const readerA = wrapTenantDatabaseReader(ctx, ctx.db, shopAId);
            const readerB = wrapTenantDatabaseReader(ctx, ctx.db, shopBId);

            // Range-bounded read of shop A's own reviews via the `by_shop` index — the tenant happy path.
            const ownRows = await readerA
                .query('reviews')
                .withIndex('by_shop', (q) => q.eq('shopId', shopAId))
                .collect();
            // A full, UNBOUNDED scan under shop B's reader: the read predicate must still filter shop A's
            // review to nothing, proving the deny is per-document and not merely a function of the index range.
            const crossScanRows = await readerB.query('reviews').collect();

            return {
                reviewAId,
                ownCount: ownRows.length,
                ownId: ownRows[0]?._id,
                crossCount: crossScanRows.length,
            };
        });

        expect(result.ownCount).toBe(1);
        expect(result.ownId).toBe(result.reviewAId);
        expect(result.crossCount).toBe(0);
    });

    it('denies a no-rule table under the wrapped reader (deny default)', async () => {
        const t = convexTest(schema, modules);

        const counts = await t.run(async (ctx) => {
            const shopId = await ctx.db.insert('shops', shopSeed('shop_c', 'c.example.com'));
            // `pages` is tenant-scoped but keyed on a string `shop`, so it carries NO rule in `tenantRules`.
            await ctx.db.insert('pages', { shop: shopId, title: 'Home', slug: 'home', createdAt: NOW, updatedAt: NOW });
            // `featureFlags` is platform-global and intentionally rule-less (served by `systemQuery`).
            await ctx.db.insert('featureFlags', {
                legacyId: 'flag_legacy',
                key: 'global.flag',
                defaultValue: true,
                targeting: [],
                createdAt: NOW,
                updatedAt: NOW,
            });

            const reader = wrapTenantDatabaseReader(ctx, ctx.db, shopId);
            return {
                pages: (await reader.query('pages').collect()).length,
                featureFlags: (await reader.query('featureFlags').collect()).length,
            };
        });

        expect(counts.pages).toBe(0);
        expect(counts.featureFlags).toBe(0);
    });

    it('denies inserts into a no-rule table under the wrapped writer (deny default)', async () => {
        const t = convexTest(schema, modules);

        await expect(
            t.run(async (ctx) => {
                const shopId = await ctx.db.insert('shops', shopSeed('shop_d', 'd.example.com'));
                const writer = wrapTenantDatabaseWriter(ctx, ctx.db, shopId);
                await writer.insert('pages', {
                    shop: shopId,
                    title: 'Blocked',
                    slug: 'blocked',
                    createdAt: NOW,
                    updatedAt: NOW,
                });
            }),
        ).rejects.toThrow('insert access not allowed');
    });

    it('denies a cross-tenant insert into a tenant table under the wrapped writer', async () => {
        const t = convexTest(schema, modules);

        await expect(
            t.run(async (ctx) => {
                const shopAId = await ctx.db.insert('shops', shopSeed('shop_e', 'e.example.com'));
                const shopBId = await ctx.db.insert('shops', shopSeed('shop_f', 'f.example.com'));
                // Writer scoped to shop B attempts to insert a review owned by shop A — the `insert`
                // predicate (`doc.shopId === shopId`) must reject it.
                const writer = wrapTenantDatabaseWriter(ctx, ctx.db, shopBId);
                await writer.insert('reviews', { shopId: shopAId, createdAt: NOW, updatedAt: NOW });
            }),
        ).rejects.toThrow('insert access not allowed');
    });
});
