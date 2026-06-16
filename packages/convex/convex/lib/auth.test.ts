import type { GenericMutationCtx } from 'convex/server';
import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DataModel, Id } from '../_generated/dataModel';
import schema from '../schema';
import {
    AuthErrorCode,
    getClerkOperatorIdentity,
    resolveAdminShopId,
    resolveShopAccess,
    resolveUserFromIdentity,
} from './auth';
import { systemMutation, systemQuery } from './system';

/**
 * The trusted Clerk operator issuer the resolvers assert against. Set into `CLERK_FRONTEND_API_URL`
 * for every case below so the Clerk-issuer check is active under `convex-test`, whose `withIdentity`
 * fakes identities WITHOUT Convex's real signature/issuer validation — making it the only place the
 * forged-token rejection can be exercised. Operators now authenticate through Clerk (admin tier),
 * so the admin resolution chain validates THIS issuer, not the customer `CONVEX_AUTH_ISSUER`.
 */
const CLERK_ISSUER = 'https://clerk.test.nordcom.io';

/** Fixed epoch-ms stamp shared by every seeded row so the seeds are deterministic across cases. */
const SEED_NOW = 1_700_000_000_000;

/**
 * Inserts one platform `users` row, the single seed point both {@link seedCollaborator} and
 * {@link seedShopAccess} share so the row shape (`emailVerified`/`identities`/managed timestamps) is
 * declared once. `clerkUserId` is optional: stamp it to exercise subject-keyed operator resolution,
 * leave it unset to exercise the email fallback.
 *
 * @param ctx - A system-tier mutation context exposing the raw writer `db`.
 * @param email - The user's email (the `by_email` fallback key).
 * @param clerkUserId - Optional Clerk subject stamped onto `users.clerkUserId`.
 * @returns The inserted `users` row id.
 */
function insertOperatorUser(
    ctx: Pick<GenericMutationCtx<DataModel>, 'db'>,
    email: string,
    clerkUserId?: string,
): Promise<Id<'users'>> {
    return ctx.db.insert('users', {
        email,
        name: 'Operator',
        emailVerified: null,
        identities: [],
        clerkUserId,
        createdAt: SEED_NOW,
        updatedAt: SEED_NOW,
    });
}

/**
 * Seeds a platform user plus `shopCount` shops, each with a `shopCollaborators` row linking the
 * user to that shop, exercising the real {@link resolveAdminShopId} membership chain end to end.
 * Written through the system tier's raw `ctx.db` because `users`/`shops`/`shopCollaborators` are
 * platform-global tables the system tier is sanctioned to write unscoped. The optional
 * `clerkUserId` stamps the Clerk subject onto the row so the subject-keyed operator resolution
 * resolves (leave it unset to exercise the email fallback). Returns the seeded email and the FIRST
 * shop's id so the single-shop case can assert the exact resolution. `shopCount: 0` seeds the user
 * alone, exercising the zero-membership `NO_SHOP_MEMBERSHIP` branch.
 */
const seedCollaborator = systemMutation({
    args: { email: v.string(), shopCount: v.number(), clerkUserId: v.optional(v.string()) },
    handler: async (ctx, { email, shopCount, clerkUserId }) => {
        const now = SEED_NOW;
        const userId = await insertOperatorUser(ctx, email, clerkUserId);

        let firstShopId: string | null = null;
        for (let index = 0; index < shopCount; index++) {
            const shopId = await ctx.db.insert('shops', {
                legacyId: `shop_${index}`,
                name: `Shop ${index}`,
                domain: `shop-${index}.example.com`,
                design: {
                    header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: `Shop ${index}` } },
                    accents: [],
                },
                commerceProvider: { type: 'stripe', authentication: {} },
                createdAt: now,
                updatedAt: now,
            });
            if (firstShopId === null) firstShopId = shopId;
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
        }

        return { userId, firstShopId };
    },
});

/**
 * A {@link systemQuery} that runs the real {@link resolveAdminShopId} against the request's
 * `convex-test` identity, so the resolution is exercised through an actual Convex function ctx
 * (carrying `auth` + `db`) rather than a hand-built stub.
 */
const resolveShopIdFixture = systemQuery({
    args: {},
    handler: async (ctx) => resolveAdminShopId(ctx),
});

/**
 * Seeds the Clerk-org tenancy graph {@link resolveShopAccess} authorizes against: a `users` row
 * (subject-keyed via `clerkUserId`), an `orgs` mirror row, a shop carrying `clerkOrgId` plus its
 * routing `shopDomains.by_domain` row, and — unless `withoutMembership` — the `orgMemberships` row
 * joining the user to that org. Toggles let each case carve a single failure mode: `withoutOrg` omits
 * the shop's `clerkOrgId` (SHOP_WITHOUT_ORG), `withoutMembership` omits the membership join
 * (NO_ORG_MEMBERSHIP), and `orphanShop` deletes the shop AFTER its `shopDomains` row exists, leaving a
 * dangling routing FK (SHOP_ORPHANED). Written through the system tier's raw `ctx.db` because every
 * table here is platform-global. Returns the seeded `shopId`, `domain`, and `clerkOrgId` so cases can
 * assert exactly.
 */
const seedShopAccess = systemMutation({
    args: {
        email: v.string(),
        clerkUserId: v.string(),
        clerkOrgId: v.string(),
        domain: v.string(),
        withoutOrg: v.optional(v.boolean()),
        withoutMembership: v.optional(v.boolean()),
        orphanShop: v.optional(v.boolean()),
    },
    handler: async (ctx, { email, clerkUserId, clerkOrgId, domain, withoutOrg, withoutMembership, orphanShop }) => {
        const now = SEED_NOW;
        const userId = await insertOperatorUser(ctx, email, clerkUserId);

        await ctx.db.insert('orgs', {
            clerkOrgId,
            name: 'Acme Org',
            slug: 'acme-org',
            createdAt: now,
            updatedAt: now,
        });

        const shopId = await ctx.db.insert('shops', {
            legacyId: 'shop_access',
            name: 'Access Shop',
            domain,
            clerkOrgId: withoutOrg ? undefined : clerkOrgId,
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Access Shop' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: now,
            updatedAt: now,
        });
        await ctx.db.insert('shopDomains', { shop: shopId, domain });

        if (!withoutMembership) {
            await ctx.db.insert('orgMemberships', {
                clerkOrgId,
                user: userId,
                clerkUserId,
                role: 'org:admin',
                createdAt: now,
            });
        }

        // Delete the shop AFTER its routing row so the `shopDomains` row dangles, exercising SHOP_ORPHANED.
        if (orphanShop) {
            await ctx.db.delete(shopId);
        }

        return { shopId, domain, clerkOrgId };
    },
});

/**
 * A {@link systemQuery} that runs the real {@link resolveShopAccess} for a given `domain` against the
 * request's `convex-test` identity, so the Clerk-org authorization gate (identity → user → owning-org
 * membership → shop) is exercised through an actual Convex function ctx rather than a hand-built stub.
 */
const resolveShopAccessFixture = systemQuery({
    args: { domain: v.string() },
    handler: async (ctx, { domain }) => resolveShopAccess(ctx, domain),
});

/**
 * A {@link systemQuery} that runs the real {@link getClerkOperatorIdentity} against the request's
 * `convex-test` identity and returns its `subject`/`issuer`, so the Clerk-issuer assertion is
 * exercised through an actual Convex function ctx rather than a hand-built stub.
 */
const clerkOperatorIdentityFixture = systemQuery({
    args: {},
    handler: async (ctx) => {
        const identity = await getClerkOperatorIdentity(ctx);
        return { subject: identity.subject, issuer: identity.issuer };
    },
});

/**
 * A {@link systemQuery} that runs the real {@link resolveUserFromIdentity} (Clerk-based operator
 * resolution) against the request's `convex-test` identity and returns the resolved user's `_id`,
 * `email`, and `clerkUserId`, so the subject-keyed lookup and its email fallback are exercised
 * through an actual Convex function ctx.
 */
const resolveOperatorFixture = systemQuery({
    args: {},
    handler: async (ctx) => {
        const user = await resolveUserFromIdentity(ctx);
        return { id: user._id, email: user.email, clerkUserId: user.clerkUserId };
    },
});

/**
 * Hand-built module map for `convex-test` (see `lib/system.test.ts` for the full rationale):
 * Biome forbids exporting fixtures from a test file and the default glob excludes the
 * self-importing module, so the fixtures are mapped to this module's path to resolve by
 * `FunctionReference` — the supported invocation path that runs the real constructors end to end.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/lib/auth.test.ts': () =>
        Promise.resolve({
            seedCollaborator,
            resolveShopIdFixture,
            seedShopAccess,
            resolveShopAccessFixture,
            clerkOperatorIdentityFixture,
            resolveOperatorFixture,
        }),
};

const seedCollaboratorRef = makeFunctionReference<'mutation'>('lib/auth.test:seedCollaborator');
const resolveShopIdRef = makeFunctionReference<'query'>('lib/auth.test:resolveShopIdFixture');
const seedShopAccessRef = makeFunctionReference<'mutation'>('lib/auth.test:seedShopAccess');
const resolveShopAccessRef = makeFunctionReference<'query'>('lib/auth.test:resolveShopAccessFixture');
const clerkOperatorIdentityRef = makeFunctionReference<'query'>('lib/auth.test:clerkOperatorIdentityFixture');
const resolveOperatorRef = makeFunctionReference<'query'>('lib/auth.test:resolveOperatorFixture');

beforeEach(() => {
    // The operator resolvers assert the identity issuer against `CLERK_FRONTEND_API_URL`; stub it so
    // the check is active under `convex-test` (whose `withIdentity` skips Convex's real issuer
    // validation). Admin operators authenticate through Clerk after the auth migration.
    vi.stubEnv('CLERK_FRONTEND_API_URL', CLERK_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('getClerkOperatorIdentity', () => {
    it('returns the identity when its issuer matches the configured Clerk issuer', async () => {
        const t = convexTest(schema, modules);

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });
        const result = await asOperator.query(clerkOperatorIdentityRef, {});

        expect(result).toMatchObject({ subject: 'user_1', issuer: CLERK_ISSUER });
    });

    it('rejects a forged token whose issuer is not the Clerk issuer', async () => {
        const t = convexTest(schema, modules);

        const forged = t.withIdentity({
            issuer: 'https://attacker.example.com',
            subject: 'user_1',
            email: 'operator@example.com',
        });

        await expect(forged.query(clerkOperatorIdentityRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });
    });

    it('rejects an unauthenticated request with no identity', async () => {
        const t = convexTest(schema, modules);

        await expect(t.query(clerkOperatorIdentityRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNAUTHENTICATED },
        });
    });

    it('fails closed when the Clerk operator issuer is unconfigured (does NOT trust the identity)', async () => {
        const t = convexTest(schema, modules);
        // With no trusted operator issuer set, the privileged operator gate must reject rather than
        // fall through to bare platform validation — otherwise a customer customJwt token could slip
        // into operator paths. A valid-looking Clerk identity is still rejected here.
        vi.stubEnv('CLERK_FRONTEND_API_URL', '');

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });
        await expect(asOperator.query(clerkOperatorIdentityRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });
    });
});

describe('resolveUserFromIdentity (Clerk operator resolution)', () => {
    it('resolves the operator by clerkUserId subject', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedCollaboratorRef, {
            email: 'operator@example.com',
            shopCount: 1,
            clerkUserId: 'user_1',
        });

        // A subject hit must NOT depend on the email claim matching the row's email.
        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'different@example.com' });
        const result = await asOperator.query(resolveOperatorRef, {});

        expect(result).toMatchObject({ email: 'operator@example.com', clerkUserId: 'user_1' });
    });

    it('falls back to the email claim when no row matches the clerkUserId subject', async () => {
        const t = convexTest(schema, modules);
        // Seed WITHOUT a clerkUserId so the subject lookup misses and the email fallback resolves.
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 1 });

        const asOperator = t.withIdentity({
            issuer: CLERK_ISSUER,
            subject: 'user_unmapped',
            email: 'operator@example.com',
        });
        const result = await asOperator.query(resolveOperatorRef, {});

        expect(result.email).toBe('operator@example.com');
        // The seeded row carries no clerkUserId, proving this hit came from the email fallback, not subject.
        expect(result.clerkUserId).toBeUndefined();
    });

    it('rejects an identity matching neither subject nor email as UNKNOWN_USER', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 1, clerkUserId: 'user_1' });

        const stranger = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_99', email: 'nobody@example.com' });

        await expect(stranger.query(resolveOperatorRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNKNOWN_USER },
        });
    });
});

describe('resolveAdminShopId', () => {
    it('resolves a trusted identity to its single collaborator shopId, never a client arg', async () => {
        const t = convexTest(schema, modules);
        const { firstShopId } = await t.mutation(seedCollaboratorRef, {
            email: 'operator@example.com',
            shopCount: 1,
            clerkUserId: 'user_1',
        });

        const asOperator = t.withIdentity({
            issuer: CLERK_ISSUER,
            subject: 'user_1',
            email: 'operator@example.com',
        });
        const shopId = await asOperator.query(resolveShopIdRef, {});

        expect(shopId).toBe(firstShopId);
    });

    it('rejects a forged token whose issuer is not the trusted Clerk issuer', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 1, clerkUserId: 'user_1' });

        const forged = t.withIdentity({
            issuer: 'https://attacker.example.com',
            subject: 'user_1',
            email: 'operator@example.com',
        });

        await expect(forged.query(resolveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });
    });

    it('rejects an unauthenticated request with no identity', async () => {
        const t = convexTest(schema, modules);

        await expect(t.query(resolveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNAUTHENTICATED },
        });
    });

    it('rejects a trusted identity that maps to no platform user', async () => {
        const t = convexTest(schema, modules);

        const stranger = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_99', email: 'nobody@example.com' });

        await expect(stranger.query(resolveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNKNOWN_USER },
        });
    });

    it('rejects a resolved user with zero shop collaborations as NO_SHOP_MEMBERSHIP', async () => {
        const t = convexTest(schema, modules);
        // Seed the user alone (no shops, no collaborator rows) so the membership query returns empty.
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 0, clerkUserId: 'user_1' });

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });

        await expect(asOperator.query(resolveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.NO_SHOP_MEMBERSHIP },
        });
    });

    it('rejects an identity collaborating on multiple shops as ambiguous (active-tenant selection is CONVEXCORE-16)', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 2, clerkUserId: 'user_1' });

        const asOperator = t.withIdentity({
            issuer: CLERK_ISSUER,
            subject: 'user_1',
            email: 'operator@example.com',
        });

        await expect(asOperator.query(resolveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.AMBIGUOUS_SHOP_MEMBERSHIP },
        });
    });
});

describe('resolveShopAccess', () => {
    const DOMAIN = 'acme-shop.example.com';

    it("authorizes an operator who is a member of the shop's owning org", async () => {
        const t = convexTest(schema, modules);
        const { shopId } = await t.mutation(seedShopAccessRef, {
            email: 'operator@example.com',
            clerkUserId: 'user_1',
            clerkOrgId: 'org_1',
            domain: DOMAIN,
        });

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });
        const resolved = await asOperator.query(resolveShopAccessRef, { domain: DOMAIN });

        expect(resolved).toBe(shopId);
    });

    it("rejects an operator with no membership in the shop's owning org as NO_ORG_MEMBERSHIP", async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedShopAccessRef, {
            email: 'operator@example.com',
            clerkUserId: 'user_1',
            clerkOrgId: 'org_1',
            domain: DOMAIN,
            withoutMembership: true,
        });

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });

        await expect(asOperator.query(resolveShopAccessRef, { domain: DOMAIN })).rejects.toMatchObject({
            data: { code: AuthErrorCode.NO_ORG_MEMBERSHIP },
        });
    });

    it('rejects an unknown domain claimed by no shop as UNKNOWN_SHOP', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedShopAccessRef, {
            email: 'operator@example.com',
            clerkUserId: 'user_1',
            clerkOrgId: 'org_1',
            domain: DOMAIN,
        });

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });

        await expect(asOperator.query(resolveShopAccessRef, { domain: 'unclaimed.example.com' })).rejects.toMatchObject(
            {
                data: { code: AuthErrorCode.UNKNOWN_SHOP },
            },
        );
    });

    it('rejects a routing row whose shop FK dangles as SHOP_ORPHANED', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedShopAccessRef, {
            email: 'operator@example.com',
            clerkUserId: 'user_1',
            clerkOrgId: 'org_1',
            domain: DOMAIN,
            orphanShop: true,
        });

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });

        await expect(asOperator.query(resolveShopAccessRef, { domain: DOMAIN })).rejects.toMatchObject({
            data: { code: AuthErrorCode.SHOP_ORPHANED },
        });
    });

    it('rejects a shop missing its clerkOrgId as SHOP_WITHOUT_ORG', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedShopAccessRef, {
            email: 'operator@example.com',
            clerkUserId: 'user_1',
            clerkOrgId: 'org_1',
            domain: DOMAIN,
            withoutOrg: true,
        });

        const asOperator = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_1', email: 'operator@example.com' });

        await expect(asOperator.query(resolveShopAccessRef, { domain: DOMAIN })).rejects.toMatchObject({
            data: { code: AuthErrorCode.SHOP_WITHOUT_ORG },
        });
    });
});
