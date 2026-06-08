import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { systemMutation, systemQuery } from '../../convex/convex/lib/system';
import { tenantMutation, tenantQuery } from '../../convex/convex/lib/tenant';
import schema from '../../convex/convex/schema';
import { createUnitConvex } from './unit';

/**
 * The trusted NextAuth issuer the tenant constructors assert against (via `resolveAdminShopId`). Stubbed
 * into `CONVEX_AUTH_ISSUER` so the in-handler issuer check is active under `convex-test`, whose
 * `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/** Operator identity the tenant path resolves a shop for, keyed via `users.by_email`. */
const OPERATOR_EMAIL = 'unit-op@example.com';

/**
 * A fixed epoch-ms stamp for the seeded rows' managed `createdAt`/`updatedAt`. Its value is irrelevant to
 * the round-trip assertion; it only has to satisfy the numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Bootstraps the single tenant the sample exercises: one operator user, one shop, and a collaborator link
 * so `resolveAdminShopId` maps the operator identity to the shop. Runs on the system tier's raw `ctx.db`,
 * the sanctioned unscoped path for the platform-global `users`/`shops`/`shopCollaborators` tables — the
 * tenant tier cannot seed these because it resolves a shop that does not yet exist.
 *
 * @returns The seeded `shops` id the tenant path resolves for {@link OPERATOR_EMAIL}.
 */
const seedFixture = systemMutation({
    args: {},
    handler: async (ctx) => {
        const userId = await ctx.db.insert('users', {
            email: OPERATOR_EMAIL,
            name: 'Operator',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        });
        const shopId = await ctx.db.insert('shops', {
            legacyId: 'unit_shop',
            name: 'Unit Shop',
            domain: 'unit.example.com',
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Unit Shop' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        });
        await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
        return shopId;
    },
});

/**
 * Inserts a review owned by the server-resolved tenant through the tenant mutation's RLS-wrapped writer.
 * The write half of the round-trip the sample asserts.
 *
 * @returns The created `reviews` id.
 */
const addReviewFixture = tenantMutation({
    args: {},
    handler: async (ctx) => ctx.db.insert('reviews', { shopId: ctx.shopId, createdAt: NOW, updatedAt: NOW }),
});

/**
 * Lists reviews through the tenant query's RLS-wrapped, deny-default reader. The tenant-tier read half of
 * the round-trip: it returns the server-resolved `shopId` plus every review the wrapped db exposes.
 *
 * @returns The resolved tenant id and the shop ids of the reviews visible to that tenant.
 */
const listReviewsFixture = tenantQuery({
    args: {},
    handler: async (ctx) => {
        const rows = await ctx.db.query('reviews').collect();
        return { resolvedShopId: ctx.shopId, reviewShopIds: rows.map((row) => row.shopId) };
    },
});

/**
 * Counts reviews through the system query's raw, un-RLS-wrapped `ctx.db`. The system-tier read half of the
 * round-trip, proving the same doc is reachable through both tiers.
 *
 * @param shopId - The shop whose owned reviews to count.
 * @returns The number of reviews scoped to `shopId` across the whole (unscoped) db.
 */
const countReviewsFixture = systemQuery({
    args: { shopId: v.id('shops') },
    handler: async (ctx, { shopId }) => {
        const rows = await ctx.db
            .query('reviews')
            .withIndex('by_shop', (q) => q.eq('shopId', shopId))
            .collect();
        return rows.length;
    },
});

/**
 * Hand-built fixture module for `convex-test`: Biome forbids exporting fixtures from a test file and the
 * default glob excludes the self-importing module, so the fixtures map to this module's virtual path and
 * resolve by `FunctionReference`, running the real tenant/system constructors end to end.
 */
const fixtureModules = {
    '/convex/unit.test.ts': () =>
        Promise.resolve({ seedFixture, addReviewFixture, listReviewsFixture, countReviewsFixture }),
};

const seedRef = makeFunctionReference<'mutation'>('unit.test:seedFixture');
const addReviewRef = makeFunctionReference<'mutation'>('unit.test:addReviewFixture');
const listReviewsRef = makeFunctionReference<'query'>('unit.test:listReviewsFixture');
const countReviewsRef = makeFunctionReference<'query'>('unit.test:countReviewsFixture');

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('createUnitConvex (in-memory unit harness)', () => {
    it('round-trips a doc written through tenantMutation and read through tenantQuery and systemQuery', async () => {
        const t = createUnitConvex(schema, fixtureModules);
        const shopId = await t.mutation(seedRef, {});

        const asOperator = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|unit', email: OPERATOR_EMAIL });
        const reviewId = await asOperator.mutation(addReviewRef, {});

        // Tenant-tier read: the RLS-wrapped reader resolves the operator's shop and sees its own review.
        const tenantView = await asOperator.query(listReviewsRef, {});
        expect(tenantView.resolvedShopId).toBe(shopId);
        expect(tenantView.reviewShopIds).toEqual([shopId]);

        // System-tier read: the raw db reaches the very same row the tenant write committed.
        const systemCount = await t.query(countReviewsRef, { shopId });
        expect(systemCount).toBe(1);

        expect(reviewId).toBeTruthy();
    });
});
