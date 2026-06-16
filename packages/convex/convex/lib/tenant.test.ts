import { makeFunctionReference } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import schema from '../schema';
import { AuthErrorCode } from './auth';
import { systemMutation } from './system';
import { tenantMutation, tenantQuery } from './tenant';

/**
 * The trusted Clerk operator issuer the tenant constructors assert against (via the Clerk-based
 * operator resolution in `resolveAdminShopId`). Set into `CLERK_FRONTEND_API_URL` for every case so
 * the issuer check is active under `convex-test`, whose `withIdentity` fakes identities WITHOUT
 * Convex's real signature/issuer validation. Operators authenticate through Clerk after the auth
 * migration, so the tenant resolution chain validates THIS issuer, not `CONVEX_AUTH_ISSUER`.
 */
const CLERK_ISSUER = 'https://clerk.test.nordcom.io';

/**
 * A fixed epoch-ms stamp for seeded rows' managed `createdAt`/`updatedAt`. Its exact value is irrelevant
 * to the isolation assertions; it only has to satisfy the required numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Seeds two fully isolated tenants through the system tier's raw `ctx.db` (the sanctioned unscoped path
 * for platform-global `users`/`shops`/`shopCollaborators`): operator A collaborating only on shop A and
 * operator B only on shop B, each shop owning exactly one pre-existing review. Each shop is also wired
 * into the Clerk-org tenancy graph `resolveShopAccess` authorizes against — its own owning `orgs` row,
 * a `clerkOrgId` on the shop, a `shopDomains.by_domain` routing row, and an `orgMemberships` row
 * joining the operator to the shop's owning org — so the `shopDomain`-selector path (routed domain →
 * org membership → shop id) is exercisable end to end alongside the lone-membership fallback. Returns
 * both shop ids and their primary domains so the assertions can name the foreign tenant whose rows must
 * stay invisible and address each shop by its routed domain.
 *
 * @returns The two seeded `shops` ids and primary domains keyed by operator.
 */
const seedTenants = systemMutation({
    args: { emailA: v.string(), emailB: v.string() },
    handler: async (ctx, { emailA, emailB }) => {
        /**
         * Inserts one operator user, one shop (carrying its owning `clerkOrgId`), the org mirror row,
         * a collaborator linking them, the shop's `shopDomains` routing row, the org-membership join,
         * and a single owned review.
         *
         * @param email - The operator's email (the identity claim resolution keys on).
         * @param legacyId - The shop's legacy/source id and display name seed.
         * @param domain - The shop's primary domain (its `shopDomains.by_domain` routing key).
         * @param clerkOrgId - The shop's owning Clerk org id (also the org/membership mirror key).
         * @returns The created `shops` id.
         */
        const seedTenant = async (email: string, legacyId: string, domain: string, clerkOrgId: string) => {
            const userId = await ctx.db.insert('users', {
                email,
                name: 'Operator',
                emailVerified: null,
                identities: [],
                createdAt: NOW,
                updatedAt: NOW,
            });
            await ctx.db.insert('orgs', {
                clerkOrgId,
                name: `${legacyId} Org`,
                slug: `${legacyId}-org`,
                createdAt: NOW,
                updatedAt: NOW,
            });
            const shopId = await ctx.db.insert('shops', {
                legacyId,
                name: legacyId,
                domain,
                clerkOrgId,
                design: {
                    header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: legacyId } },
                    accents: [],
                },
                commerceProvider: { type: 'stripe', authentication: {} },
                createdAt: NOW,
                updatedAt: NOW,
            });
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
            await ctx.db.insert('shopDomains', { shop: shopId, domain });
            await ctx.db.insert('orgMemberships', {
                clerkOrgId,
                user: userId,
                clerkUserId: `clerk_${email}`,
                role: 'org:admin',
                createdAt: NOW,
            });
            await ctx.db.insert('reviews', { shopId, createdAt: NOW, updatedAt: NOW });
            return shopId;
        };

        const shopAId = await seedTenant(emailA, 'shop_a', 'a.example.com', 'org_a');
        const shopBId = await seedTenant(emailB, 'shop_b', 'b.example.com', 'org_b');
        return { shopAId, shopBId, domainA: 'a.example.com', domainB: 'b.example.com' };
    },
});

/**
 * Joins an existing operator (by email) to an existing shop (by `legacyId`) on BOTH membership planes,
 * turning a single-shop fixture into the multi-shop-operator shape the selector path exists for: a
 * `shopCollaborators` row (the lone-membership fallback's `AMBIGUOUS_SHOP_MEMBERSHIP` trigger) plus the
 * `orgMemberships` join to the shop's owning `clerkOrgId` (what `resolveShopAccess` re-checks when the
 * routed `shopDomain` selector picks that shop). Both are required so the same operator can be a true
 * multi-ORG, multi-SHOP operator — the case the routed selector disambiguates that the org `org_id`
 * claim alone cannot.
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
        const { clerkOrgId } = shop;
        if (clerkOrgId) {
            await ctx.db.insert('orgMemberships', {
                clerkOrgId,
                user: user._id,
                clerkUserId: `clerk_${email}`,
                role: 'org:admin',
                createdAt: NOW,
            });
        }
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
    vi.stubEnv('CLERK_FRONTEND_API_URL', CLERK_ISSUER);
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

        const asOperatorA = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'github|a', email: 'op-a@example.com' });
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

        const asOperatorA = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'github|a', email: 'op-a@example.com' });
        const asOperatorB = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'github|b', email: 'op-b@example.com' });

        await asOperatorA.mutation(addReviewRef, {});

        const seenByB = await asOperatorB.query(listReviewsRef, {});
        expect(seenByB.resolvedShopId).toBe(shopBId);
        // B sees ONLY its single seeded review — A's seeded review AND A's new write are both invisible.
        expect(seenByB.reviewShopIds).toEqual([shopBId]);

        // A, by contrast, now sees two of its own reviews (the seed plus the write), proving the write landed.
        const seenByA = await asOperatorA.query(listReviewsRef, {});
        expect(seenByA.reviewShopIds).toEqual([shopAId, shopAId]);
    });

    it('rejects a selector-less multi-shop operator as AMBIGUOUS_SHOP_MEMBERSHIP (the fallback)', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedTenantsRef, {
            emailA: 'op-a@example.com',
            emailB: 'op-b@example.com',
        });
        // Operator A now collaborates on BOTH shops; with no routed `shopDomain` selector the
        // lone-membership fallback cannot disambiguate and refuses, exactly as before — the routed
        // selector path is what resolves this case (the `routed shopDomain selector` suite below).
        await t.mutation(linkCollaboratorRef, { email: 'op-a@example.com', shopLegacyId: 'shop_b' });
        const base = { issuer: CLERK_ISSUER, subject: 'github|a', email: 'op-a@example.com' };

        await expect(t.withIdentity(base).query(listReviewsRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.AMBIGUOUS_SHOP_MEMBERSHIP },
        });
    });
});

describe('tenantQuery / tenantMutation (routed shopDomain selector)', () => {
    it('scopes a multi-shop operator to the routed shopDomain, resolving the RIGHT shop', async () => {
        const t = convexTest(schema, modules);
        const { shopAId, shopBId, domainA, domainB } = await t.mutation(seedTenantsRef, {
            emailA: 'op-a@example.com',
            emailB: 'op-b@example.com',
        });
        // Operator A now belongs to BOTH shops' owning orgs — the multi-org, multi-shop shape the
        // routed selector exists to disambiguate (the org `org_id` claim alone cannot, since an org
        // owns many shops). Without a selector this same operator is AMBIGUOUS_SHOP_MEMBERSHIP.
        await t.mutation(linkCollaboratorRef, { email: 'op-a@example.com', shopLegacyId: 'shop_b' });
        const base = { issuer: CLERK_ISSUER, subject: 'github|a', email: 'op-a@example.com' };

        const seenA = await t.withIdentity(base).query(listReviewsRef, { shopDomain: domainA });
        expect(seenA.resolvedShopId).toBe(shopAId);
        expect(seenA.reviewShopIds).toEqual([shopAId]);

        const seenB = await t.withIdentity(base).query(listReviewsRef, { shopDomain: domainB });
        expect(seenB.resolvedShopId).toBe(shopBId);
        expect(seenB.reviewShopIds).toEqual([shopBId]);
    });

    it('strips shopDomain from the handler args, leaving the inner validator unchanged', async () => {
        const t = convexTest(schema, modules);
        const { shopAId, domainA } = await t.mutation(seedTenantsRef, {
            emailA: 'op-a@example.com',
            emailB: 'op-b@example.com',
        });

        const asOperatorA = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'github|a', email: 'op-a@example.com' });
        // The constructor consumes `shopDomain`: the handler that reads `args.shopId` never sees it,
        // so the echoed requestedShopId stays null even though shopDomain travelled on the wire.
        const result = await asOperatorA.query(listReviewsRef, { shopDomain: domainA });

        expect(result.resolvedShopId).toBe(shopAId);
        expect(result.requestedShopId).toBeNull();
    });

    it('routes a write through the routed shopDomain, isolating it to that tenant', async () => {
        const t = convexTest(schema, modules);
        const { shopAId, shopBId, domainA, domainB } = await t.mutation(seedTenantsRef, {
            emailA: 'op-a@example.com',
            emailB: 'op-b@example.com',
        });
        await t.mutation(linkCollaboratorRef, { email: 'op-a@example.com', shopLegacyId: 'shop_b' });
        const base = { issuer: CLERK_ISSUER, subject: 'github|a', email: 'op-a@example.com' };

        // The SAME operator authors under shop A (routed), and the write stays invisible to shop B.
        await t.withIdentity(base).mutation(addReviewRef, { shopDomain: domainA });

        const seenA = await t.withIdentity(base).query(listReviewsRef, { shopDomain: domainA });
        expect(seenA.resolvedShopId).toBe(shopAId);
        expect(seenA.reviewShopIds).toEqual([shopAId, shopAId]);

        const seenB = await t.withIdentity(base).query(listReviewsRef, { shopDomain: domainB });
        expect(seenB.resolvedShopId).toBe(shopBId);
        expect(seenB.reviewShopIds).toEqual([shopBId]);
    });

    it('rejects a routed shopDomain whose owning org the operator does not belong to (NO_ORG_MEMBERSHIP)', async () => {
        const t = convexTest(schema, modules);
        const { domainB } = await t.mutation(seedTenantsRef, {
            emailA: 'op-a@example.com',
            emailB: 'op-b@example.com',
        });

        // Operator A is a member of shop A's org only; routing to shop B (which A's orgs do not own)
        // is refused. The selector re-checks owning-org membership, so a spoofed domain cannot reach
        // a foreign tenant — the org-tenancy analogue of the active-shop FORBIDDEN guard.
        const asOperatorA = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'github|a', email: 'op-a@example.com' });
        await expect(asOperatorA.query(listReviewsRef, { shopDomain: domainB })).rejects.toMatchObject({
            data: { code: AuthErrorCode.NO_ORG_MEMBERSHIP },
        });
    });

    it('rejects a routed shopDomain claimed by no shop as UNKNOWN_SHOP', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedTenantsRef, { emailA: 'op-a@example.com', emailB: 'op-b@example.com' });

        const asOperatorA = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'github|a', email: 'op-a@example.com' });
        await expect(asOperatorA.query(listReviewsRef, { shopDomain: 'unclaimed.example.com' })).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNKNOWN_SHOP },
        });
    });

    it('falls back to lone membership when no shopDomain is supplied (single-shop operator)', async () => {
        const t = convexTest(schema, modules);
        const { shopAId } = await t.mutation(seedTenantsRef, {
            emailA: 'op-a@example.com',
            emailB: 'op-b@example.com',
        });

        // No selector: a single-shop operator still resolves through the lone-membership fallback.
        const asOperatorA = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'github|a', email: 'op-a@example.com' });
        const result = await asOperatorA.query(listReviewsRef, {});
        expect(result.resolvedShopId).toBe(shopAId);
    });
});
