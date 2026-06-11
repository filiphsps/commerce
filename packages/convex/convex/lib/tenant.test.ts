import { makeFunctionReference } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTIVE_SHOP_CLAIM, AdminShopResolverErrorCode } from '../auth/admin_shop_resolver';
import schema from '../schema';
import { AuthErrorCode } from './auth';
import { systemMutation } from './system';
import { tenantMutation, tenantQuery } from './tenant';

/**
 * The trusted NextAuth issuer the tenant constructors assert against (via `resolveAdminShopId`). Set into
 * `CONVEX_AUTH_ISSUER` for every case so the issuer check is active under `convex-test`, whose
 * `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/**
 * A fixed epoch-ms stamp for seeded rows' managed `createdAt`/`updatedAt`. Its exact value is irrelevant
 * to the isolation assertions; it only has to satisfy the required numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Seeds two fully isolated tenants through the system tier's raw `ctx.db` (the sanctioned unscoped path
 * for platform-global `users`/`shops`/`shopCollaborators`): operator A collaborating only on shop A and
 * operator B only on shop B, each shop owning exactly one pre-existing review. Returns both shop ids so
 * the cross-tenant assertions can name the foreign tenant whose rows must stay invisible.
 *
 * @returns The two seeded `shops` ids keyed by operator.
 */
const seedTenants = systemMutation({
    args: { emailA: v.string(), emailB: v.string() },
    handler: async (ctx, { emailA, emailB }) => {
        /**
         * Inserts one operator user, one shop, a collaborator linking them, and a single owned review.
         *
         * @param email - The operator's email (the identity claim resolution keys on).
         * @param legacyId - The shop's legacy/source id and display name seed.
         * @param domain - The shop's primary domain.
         * @returns The created `shops` id.
         */
        const seedTenant = async (email: string, legacyId: string, domain: string) => {
            const userId = await ctx.db.insert('users', {
                email,
                name: 'Operator',
                emailVerified: null,
                identities: [],
                createdAt: NOW,
                updatedAt: NOW,
            });
            const shopId = await ctx.db.insert('shops', {
                legacyId,
                name: legacyId,
                domain,
                design: {
                    header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: legacyId } },
                    accents: [],
                },
                commerceProvider: { type: 'stripe', authentication: {} },
                createdAt: NOW,
                updatedAt: NOW,
            });
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
            await ctx.db.insert('reviews', { shopId, createdAt: NOW, updatedAt: NOW });
            return shopId;
        };

        const shopAId = await seedTenant(emailA, 'shop_a', 'a.example.com');
        const shopBId = await seedTenant(emailB, 'shop_b', 'b.example.com');
        return { shopAId, shopBId };
    },
});

/**
 * Adds a `shopCollaborators` row linking an existing operator (by email) to an existing shop (by
 * `legacyId`), turning a single-shop fixture into the multi-shop-operator shape the active-shop
 * selection path exists for.
 */
const linkCollaborator = systemMutation({
    args: { email: v.string(), shopLegacyId: v.string() },
    handler: async (ctx, { email, shopLegacyId }) => {
        const user = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', email))
            .first();
        const shop = await ctx.db
            .query('shops')
            .withIndex('by_legacy_id', (q) => q.eq('legacyId', shopLegacyId))
            .first();
        if (!user || !shop) {
            throw new ConvexError({ code: 'FIXTURE_SEED_MISSING', message: 'Seed the operator and shop first.' });
        }
        await ctx.db.insert('shopCollaborators', { shop: shop._id, user: user._id, permissions: ['admin'] });
    },
});

/**
 * A {@link tenantQuery} fixture listing reviews through the tenant-scoped, RLS-wrapped `ctx.db`. It
 * declares a client `shopId` arg purely to PROVE the constructor ignores it: the arg is echoed back as
 * `requestedShopId` so a test can confirm the server-resolved `ctx.shopId` wins regardless of what the
 * client passed.
 */
const listReviewsFixture = tenantQuery({
    args: { shopId: v.optional(v.id('shops')) },
    handler: async (ctx, args) => {
        // Unbounded scan: the wrapped reader must still deny-filter to the resolved tenant's rows only.
        const rows = await ctx.db.query('reviews').collect();
        return {
            resolvedShopId: ctx.shopId,
            requestedShopId: args.shopId ?? null,
            reviewShopIds: rows.map((row) => row.shopId),
        };
    },
});

/**
 * A {@link tenantMutation} fixture inserting a review owned by the server-resolved tenant. Used to prove a
 * write committed under one tenant is invisible to a query run under another.
 */
const addReviewFixture = tenantMutation({
    args: {},
    handler: async (ctx) => ctx.db.insert('reviews', { shopId: ctx.shopId, createdAt: NOW, updatedAt: NOW }),
});

/**
 * Hand-built module map for `convex-test` (see `lib/auth.test.ts` for the full rationale): Biome forbids
 * exporting fixtures from a test file and the default glob excludes the self-importing module, so the
 * fixtures are mapped to this module's path to resolve by `FunctionReference`, running the real tenant
 * constructors end to end.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/lib/tenant.test.ts': () =>
        Promise.resolve({ seedTenants, linkCollaborator, listReviewsFixture, addReviewFixture }),
};

const seedTenantsRef = makeFunctionReference<'mutation'>('lib/tenant.test:seedTenants');
const linkCollaboratorRef = makeFunctionReference<'mutation'>('lib/tenant.test:linkCollaborator');
const listReviewsRef = makeFunctionReference<'query'>('lib/tenant.test:listReviewsFixture');
const addReviewRef = makeFunctionReference<'mutation'>('lib/tenant.test:addReviewFixture');

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('tenantQuery / tenantMutation (server-trusted shopId provenance)', () => {
    it('ignores a client-supplied shopId arg and scopes to the trusted identity tenant', async () => {
        const t = convexTest(schema, modules);
        const { shopAId, shopBId } = await t.mutation(seedTenantsRef, {
            emailA: 'op-a@example.com',
            emailB: 'op-b@example.com',
        });

        const asOperatorA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op-a@example.com' });
        // Operator A passes shop B's id as a spoof — the constructor must pin shop A from the identity.
        const result = await asOperatorA.query(listReviewsRef, { shopId: shopBId });

        expect(result.resolvedShopId).toBe(shopAId);
        expect(result.requestedShopId).toBe(shopBId);
        // Only shop A's own review is visible; shop B's review is denied even with B's id passed.
        expect(result.reviewShopIds).toEqual([shopAId]);
    });

    it('hides a tenantMutation under tenant A from a tenantQuery under tenant B', async () => {
        const t = convexTest(schema, modules);
        const { shopAId, shopBId } = await t.mutation(seedTenantsRef, {
            emailA: 'op-a@example.com',
            emailB: 'op-b@example.com',
        });

        const asOperatorA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op-a@example.com' });
        const asOperatorB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|b', email: 'op-b@example.com' });

        await asOperatorA.mutation(addReviewRef, {});

        const seenByB = await asOperatorB.query(listReviewsRef, {});
        expect(seenByB.resolvedShopId).toBe(shopBId);
        // B sees ONLY its single seeded review — A's seeded review AND A's new write are both invisible.
        expect(seenByB.reviewShopIds).toEqual([shopBId]);

        // A, by contrast, now sees two of its own reviews (the seed plus the write), proving the write landed.
        const seenByA = await asOperatorA.query(listReviewsRef, {});
        expect(seenByA.reviewShopIds).toEqual([shopAId, shopAId]);
    });

    it('scopes a multi-shop operator per the signed active-shop selection, refusing none and foreign', async () => {
        const t = convexTest(schema, modules);
        const { shopAId, shopBId } = await t.mutation(seedTenantsRef, {
            emailA: 'op-a@example.com',
            emailB: 'op-b@example.com',
        });
        // Operator A now collaborates on BOTH shops — the AMBIGUOUS_SHOP_MEMBERSHIP shape pre-selection.
        await t.mutation(linkCollaboratorRef, { email: 'op-a@example.com', shopLegacyId: 'shop_b' });
        const base = { issuer: TRUSTED_ISSUER, subject: 'github|a', email: 'op-a@example.com' };

        await expect(t.withIdentity(base).query(listReviewsRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.AMBIGUOUS_SHOP_MEMBERSHIP },
        });

        const asShopA = t.withIdentity({ ...base, [ACTIVE_SHOP_CLAIM]: 'shop_a' });
        const asShopB = t.withIdentity({ ...base, [ACTIVE_SHOP_CLAIM]: 'shop_b' });

        // The SAME operator authors against shop A then shop B; each write pins to the selected
        // tenant and stays invisible to the other scope.
        await asShopA.mutation(addReviewRef, {});
        const seenAsA = await asShopA.query(listReviewsRef, {});
        expect(seenAsA.resolvedShopId).toBe(shopAId);
        expect(seenAsA.reviewShopIds).toEqual([shopAId, shopAId]);

        await asShopB.mutation(addReviewRef, {});
        const seenAsB = await asShopB.query(listReviewsRef, {});
        expect(seenAsB.resolvedShopId).toBe(shopBId);
        expect(seenAsB.reviewShopIds).toEqual([shopBId, shopBId]);

        // Operator B forges a claim for shop A — a real shop B does not collaborate on. The
        // selection picks among the operator's own tenants; it can never escalate to a foreign one.
        const asForeign = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'github|b',
            email: 'op-b@example.com',
            [ACTIVE_SHOP_CLAIM]: 'shop_a',
        });
        await expect(asForeign.query(listReviewsRef, {})).rejects.toMatchObject({
            data: { code: AdminShopResolverErrorCode.ACTIVE_SHOP_FORBIDDEN },
        });
    });
});
