import { makeFunctionReference } from 'convex/server';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import schema from '../schema';
import { systemMutation, systemQuery } from './system';

/**
 * A {@link systemMutation} that writes a user, a shop, and a review for that shop in one transaction —
 * three DIFFERENT tables with no `shop`/tenant scoping — proving the system tier's writer reaches the
 * raw `ctx.db` across the whole db. The shop is seeded so the review's `shopId` (`v.id('shops')`)
 * references a real row. The real constructor (its no-op ctx customization plus the handler) is the
 * code under test.
 */
const seedAcrossDb = systemMutation({
    args: {},
    handler: async (ctx) => {
        const now = 1_700_000_000_000;
        const userId = await ctx.db.insert('users', {
            email: 'system-tier@example.com',
            name: 'System Tier',
            emailVerified: null,
            identities: [],
            createdAt: now,
            updatedAt: now,
        });
        const shopId = await ctx.db.insert('shops', {
            legacyId: 'shop_system_tier',
            name: 'System Tier',
            domain: 'system-tier.example.com',
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'System Tier' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: now,
            updatedAt: now,
        });
        const reviewId = await ctx.db.insert('reviews', {
            shopId,
            createdAt: now,
            updatedAt: now,
        });
        return { userId, shopId, reviewId };
    },
});

/**
 * A {@link systemQuery} that reads the platform-global `users` table plus the tenant-keyed `reviews`
 * and `shops` tables straight off the raw `ctx.db` with no tenant filter, proving the system tier
 * reads across the db unscoped.
 */
const readAcrossDb = systemQuery({
    args: {},
    handler: async (ctx) => ({
        users: await ctx.db.query('users').collect(),
        shops: await ctx.db.query('shops').collect(),
        reviews: await ctx.db.query('reviews').collect(),
    }),
});

/**
 * convex-test resolves functions through a module map, which it normally derives from a Vite
 * `import.meta.glob`. Biome forbids exporting fixtures from a test file (`noExportsInTest`) and the
 * default glob excludes the self-importing module, so the map is hand-built here instead: it maps
 * this module's path to the (non-exported) fixtures above so they resolve by `FunctionReference` —
 * convex-test's supported invocation path, which runs the real constructors end to end without
 * tripping Convex's "functions should not call other functions" guard that direct inline invocation
 * raises. The dummy `_generated` key carries no functions; it exists only so convex-test's
 * module-root detection can derive the shared `/convex/` prefix.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/lib/system.test.ts': () => Promise.resolve({ seedAcrossDb, readAcrossDb }),
};

const seedAcrossDbRef = makeFunctionReference<'mutation'>('lib/system.test:seedAcrossDb');
const readAcrossDbRef = makeFunctionReference<'query'>('lib/system.test:readAcrossDb');

describe('systemQuery / systemMutation', () => {
    it('writes across the db (users + shops + reviews) unscoped and reads it back off the raw db', async () => {
        const t = convexTest(schema, modules);

        const ids = await t.mutation(seedAcrossDbRef, {});
        const all = await t.query(readAcrossDbRef, {});

        // systemQuery reads the platform-global `users` table off the raw db.
        expect(all.users).toHaveLength(1);
        const [user] = all.users;
        expect(user?.email).toBe('system-tier@example.com');
        expect(user?._id).toBe(ids.userId);

        // systemMutation wrote two more unrelated tables in the same transaction — proof the writer is
        // unscoped across the whole db, not pinned to any single tenant partition. The review crosses
        // to the shop it references with no tenant boundary sitting between them.
        expect(all.shops).toHaveLength(1);
        expect(all.shops[0]?._id).toBe(ids.shopId);
        expect(all.reviews).toHaveLength(1);
        const [review] = all.reviews;
        expect(review?._id).toBe(ids.reviewId);
        expect(review?.shopId).toBe(ids.shopId);

        // DEFERRED (CONVEXCORE-06/07 + the G1 RLS exit-suite, CONVEXCORE-12): the second half of this
        // contract — "the tenant RLS rules would DENY this read/write, yet systemQuery/systemMutation
        // succeed anyway" — cannot be asserted until the tenant tier (tenantQuery/tenantMutation with
        // fail-closed rules) exists. There is nothing for the system tier to bypass at runtime today.
        // When RLS lands, add the sibling assertion there: seed a row for shop A, assume an identity
        // scoped to shop B, confirm a tenant query returns nothing, then confirm systemQuery returns
        // the row regardless. Do NOT fake an RLS layer here to force that assertion early.
    });
});
