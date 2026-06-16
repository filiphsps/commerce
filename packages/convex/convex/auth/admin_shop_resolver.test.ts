import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthErrorCode } from '../lib/auth';
import { systemMutation, systemQuery } from '../lib/system';
import schema from '../schema';
import { resolveActiveAdminShopId } from './admin_shop_resolver';

/**
 * The trusted Clerk operator issuer the inherited `lib/auth.ts` operator identity check asserts
 * against. Stubbed into `CLERK_FRONTEND_API_URL` for every case so the Clerk-issuer check is active
 * under `convex-test`, whose `withIdentity` fakes identities WITHOUT Convex's real signature/issuer
 * validation. Admin operators authenticate through Clerk after the auth migration, so the resolution
 * chain validates THIS issuer (not the customer `CONVEX_AUTH_ISSUER`).
 */
const CLERK_ISSUER = 'https://clerk.test.nordcom.io';

/** Fixed epoch-ms stamp shared by every seeded row so the seeds are deterministic across cases. */
const SEED_NOW = 1_700_000_000_000;

/**
 * Seeds a platform user plus `shopCount` shops, each with a `shopCollaborators` row linking the user to
 * that shop, so the no-domain lone-membership branch of {@link resolveActiveAdminShopId} runs end to
 * end. Written through the system tier's raw `ctx.db` because `users`/`shops`/`shopCollaborators` are
 * platform-global tables the system tier is sanctioned to write unscoped. The i-th shop carries
 * `legacyId` `shop_${i}`.
 *
 * @returns The seeded user id and the ordered list of created `{ shopId, legacyId }` pairs.
 */
const seedCollaborator = systemMutation({
    args: { email: v.string(), shopCount: v.number() },
    handler: async (ctx, { email, shopCount }) => {
        const userId = await ctx.db.insert('users', {
            email,
            name: 'Operator',
            emailVerified: null,
            identities: [],
            createdAt: SEED_NOW,
            updatedAt: SEED_NOW,
        });

        const shops: Array<{ shopId: string; legacyId: string }> = [];
        for (let index = 0; index < shopCount; index++) {
            const legacyId = `shop_${index}`;
            const shopId = await ctx.db.insert('shops', {
                legacyId,
                name: `Shop ${index}`,
                domain: `shop-${index}.example.com`,
                design: {
                    header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: `Shop ${index}` } },
                    accents: [],
                },
                commerceProvider: { type: 'stripe', authentication: {} },
                createdAt: SEED_NOW,
                updatedAt: SEED_NOW,
            });
            shops.push({ shopId, legacyId });
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
        }

        return { userId, shops };
    },
});

/**
 * Seeds the Clerk-org tenancy graph the routed-`domain` branch authorizes against: the operator user,
 * an `orgs` mirror row, a shop carrying `clerkOrgId` plus its `shopDomains.by_domain` routing row, and
 * the `orgMemberships` join (unless `withoutMembership`). Mirrors `lib/auth.test.ts`'s `seedShopAccess`
 * so the delegation case exercises the SAME graph `resolveShopAccess` reads. Returns the seeded shop id
 * and domain.
 */
const seedRoutedShop = systemMutation({
    args: {
        email: v.string(),
        clerkUserId: v.string(),
        clerkOrgId: v.string(),
        domain: v.string(),
        withoutMembership: v.optional(v.boolean()),
    },
    handler: async (ctx, { email, clerkUserId, clerkOrgId, domain, withoutMembership }) => {
        const userId = await ctx.db.insert('users', {
            email,
            name: 'Operator',
            emailVerified: null,
            identities: [],
            clerkUserId,
            createdAt: SEED_NOW,
            updatedAt: SEED_NOW,
        });
        await ctx.db.insert('orgs', {
            clerkOrgId,
            name: 'Acme Org',
            slug: 'acme-org',
            createdAt: SEED_NOW,
            updatedAt: SEED_NOW,
        });
        const shopId = await ctx.db.insert('shops', {
            legacyId: 'shop_routed',
            name: 'Routed Shop',
            domain,
            clerkOrgId,
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Routed Shop' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: SEED_NOW,
            updatedAt: SEED_NOW,
        });
        await ctx.db.insert('shopDomains', { shop: shopId, domain });
        if (!withoutMembership) {
            await ctx.db.insert('orgMemberships', {
                clerkOrgId,
                user: userId,
                clerkUserId,
                role: 'org:admin',
                createdAt: SEED_NOW,
            });
        }
        return { shopId, domain };
    },
});

/**
 * A {@link systemQuery} that runs the real {@link resolveActiveAdminShopId} against the request's
 * `convex-test` identity, forwarding the optional routed `domain`, so both the no-domain lone-membership
 * fallback and the routed delegation to `resolveShopAccess` are exercised through an actual Convex
 * function ctx (carrying `auth` + `db`) rather than a hand-built stub.
 */
const resolveActiveShopIdFixture = systemQuery({
    args: { domain: v.optional(v.string()) },
    handler: async (ctx, { domain }) => resolveActiveAdminShopId(ctx, domain),
});

/**
 * Hand-built module map for `convex-test` (see `lib/auth.test.ts` for the full rationale): Biome forbids
 * exporting fixtures from a test file and the default glob excludes the self-importing module, so the
 * fixtures are mapped to this module's path to resolve by `FunctionReference`.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/auth/admin_shop_resolver.test.ts': () =>
        Promise.resolve({ seedCollaborator, seedRoutedShop, resolveActiveShopIdFixture }),
};

const seedCollaboratorRef = makeFunctionReference<'mutation'>('auth/admin_shop_resolver.test:seedCollaborator');
const seedRoutedShopRef = makeFunctionReference<'mutation'>('auth/admin_shop_resolver.test:seedRoutedShop');
const resolveActiveShopIdRef = makeFunctionReference<'query'>(
    'auth/admin_shop_resolver.test:resolveActiveShopIdFixture',
);

beforeEach(() => {
    vi.stubEnv('CLERK_FRONTEND_API_URL', CLERK_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('resolveActiveAdminShopId', () => {
    it('falls back to the lone membership when no routed domain is supplied', async () => {
        const t = convexTest(schema, modules);
        const { shops } = await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 1 });

        const asOperator = t.withIdentity({
            issuer: CLERK_ISSUER,
            subject: 'github|1',
            email: 'operator@example.com',
        });

        await expect(asOperator.query(resolveActiveShopIdRef, {})).resolves.toBe(shops[0]?.shopId);
    });

    it('rejects a selector-less multi-shop operator as ambiguous', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 2 });

        const asOperator = t.withIdentity({
            issuer: CLERK_ISSUER,
            subject: 'github|1',
            email: 'operator@example.com',
        });

        await expect(asOperator.query(resolveActiveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.AMBIGUOUS_SHOP_MEMBERSHIP },
        });
    });

    it('delegates a routed domain to resolveShopAccess, returning the org-owned shop', async () => {
        const t = convexTest(schema, modules);
        const { shopId, domain } = await t.mutation(seedRoutedShopRef, {
            email: 'operator@example.com',
            clerkUserId: 'user_1',
            clerkOrgId: 'org_1',
            domain: 'routed.example.com',
        });

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });

        await expect(asOperator.query(resolveActiveShopIdRef, { domain })).resolves.toBe(shopId);
    });

    it('refuses a routed domain whose owning org the operator does not belong to', async () => {
        const t = convexTest(schema, modules);
        const { domain } = await t.mutation(seedRoutedShopRef, {
            email: 'operator@example.com',
            clerkUserId: 'user_1',
            clerkOrgId: 'org_1',
            domain: 'routed.example.com',
            withoutMembership: true,
        });

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });

        await expect(asOperator.query(resolveActiveShopIdRef, { domain })).rejects.toMatchObject({
            data: { code: AuthErrorCode.NO_ORG_MEMBERSHIP },
        });
    });

    it('refuses a routed domain claimed by no shop', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedRoutedShopRef, {
            email: 'operator@example.com',
            clerkUserId: 'user_1',
            clerkOrgId: 'org_1',
            domain: 'routed.example.com',
        });

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });

        await expect(
            asOperator.query(resolveActiveShopIdRef, { domain: 'unclaimed.example.com' }),
        ).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNKNOWN_SHOP },
        });
    });

    it('rejects an unauthenticated request before any resolution', async () => {
        const t = convexTest(schema, modules);

        await expect(t.query(resolveActiveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNAUTHENTICATED },
        });
    });
});
