import { convexTest } from 'convex-test';
import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import schema from '../schema';
import { AuthErrorCode, resolveAdminShopId } from './auth';
import { systemMutation, systemQuery } from './system';

/**
 * The trusted NextAuth issuer the helper asserts against. Set into `CONVEX_AUTH_ISSUER`
 * for every case below so {@link resolveAdminShopId}'s issuer check is active under
 * `convex-test`, whose `withIdentity` fakes identities WITHOUT Convex's real signature/issuer
 * validation — making it the only place the forged-token rejection can be exercised.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/**
 * Seeds a platform user plus `shopCount` shops, each with a `shopCollaborators` row linking the
 * user to that shop, exercising the real {@link resolveAdminShopId} membership chain end to end.
 * Written through the system tier's raw `ctx.db` because `users`/`shops`/`shopCollaborators` are
 * platform-global tables the system tier is sanctioned to write unscoped. Returns the seeded
 * email and the FIRST shop's id so the single-shop case can assert the exact resolution.
 */
const seedCollaborator = systemMutation({
    args: { email: v.string(), shopCount: v.number() },
    handler: async (ctx, { email, shopCount }) => {
        const now = 1_700_000_000_000;
        const userId = await ctx.db.insert('users', {
            email,
            name: 'Operator',
            emailVerified: null,
            identities: [],
            createdAt: now,
            updatedAt: now,
        });

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
 * Hand-built module map for `convex-test` (see `lib/system.test.ts` for the full rationale):
 * Biome forbids exporting fixtures from a test file and the default glob excludes the
 * self-importing module, so the fixtures are mapped to this module's path to resolve by
 * `FunctionReference` — the supported invocation path that runs the real constructors end to end.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/lib/auth.test.ts': () => Promise.resolve({ seedCollaborator, resolveShopIdFixture }),
};

const seedCollaboratorRef = makeFunctionReference<'mutation'>('lib/auth.test:seedCollaborator');
const resolveShopIdRef = makeFunctionReference<'query'>('lib/auth.test:resolveShopIdFixture');

beforeEach(() => {
    // The helper asserts the identity issuer against `CONVEX_AUTH_ISSUER`; stub it so the check is
    // active under `convex-test` (whose `withIdentity` skips Convex's real issuer validation).
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('resolveAdminShopId', () => {
    it('resolves a trusted identity to its single collaborator shopId, never a client arg', async () => {
        const t = convexTest(schema, modules);
        const { firstShopId } = await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 1 });

        const asOperator = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|1', email: 'operator@example.com' });
        const shopId = await asOperator.query(resolveShopIdRef, {});

        expect(shopId).toBe(firstShopId);
    });

    it('rejects a forged token whose issuer is not the trusted NextAuth issuer', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 1 });

        const forged = t.withIdentity({
            issuer: 'https://attacker.example.com',
            subject: 'github|1',
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

        const stranger = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|99', email: 'nobody@example.com' });

        await expect(stranger.query(resolveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNKNOWN_USER },
        });
    });

    it('rejects an identity collaborating on multiple shops as ambiguous (active-tenant selection is CONVEXCORE-16)', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 2 });

        const asOperator = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'github|1', email: 'operator@example.com' });

        await expect(asOperator.query(resolveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.AMBIGUOUS_SHOP_MEMBERSHIP },
        });
    });
});
