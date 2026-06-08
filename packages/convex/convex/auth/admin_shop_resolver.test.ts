import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthErrorCode } from '../lib/auth';
import { systemMutation, systemQuery } from '../lib/system';
import schema from '../schema';
import { ACTIVE_SHOP_CLAIM, AdminShopResolverErrorCode, resolveActiveAdminShopId } from './admin_shop_resolver';

/**
 * The trusted NextAuth issuer the inherited `lib/auth.ts` identity check asserts against. Stubbed into
 * `CONVEX_AUTH_ISSUER` for every case so `getTrustedIdentity`'s issuer check is active under
 * `convex-test`, whose `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://admin.test.nordcom.io';

/**
 * Seeds a platform user plus `shopCount` shops, each with a `shopCollaborators` row linking the user to
 * that shop, so the real {@link resolveActiveAdminShopId} membership chain runs end to end. Written
 * through the system tier's raw `ctx.db` because `users`/`shops`/`shopCollaborators` are platform-global
 * tables the system tier is sanctioned to write unscoped. The i-th shop carries `legacyId` `shop_${i}`,
 * matching the {@link ACTIVE_SHOP_CLAIM} selectors the cases pass.
 *
 * @returns The seeded user id and the ordered list of created `{ shopId, legacyId }` pairs.
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
                createdAt: now,
                updatedAt: now,
            });
            shops.push({ shopId, legacyId });
            await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
        }

        return { userId, shops };
    },
});

/**
 * Inserts a standalone shop the seeded operator does NOT collaborate on, so the FORBIDDEN path (a claim
 * selecting a real-but-foreign tenant) can be exercised. Returns the created shop's `legacyId`.
 */
const seedForeignShop = systemMutation({
    args: { legacyId: v.string() },
    handler: async (ctx, { legacyId }) => {
        const now = 1_700_000_000_000;
        await ctx.db.insert('shops', {
            legacyId,
            name: 'Foreign Shop',
            domain: `${legacyId}.example.com`,
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'Foreign' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: now,
            updatedAt: now,
        });
        return legacyId;
    },
});

/**
 * A {@link systemQuery} that runs the real {@link resolveActiveAdminShopId} against the request's
 * `convex-test` identity, so the resolution is exercised through an actual Convex function ctx
 * (carrying `auth` + `db`) rather than a hand-built stub.
 */
const resolveActiveShopIdFixture = systemQuery({
    args: {},
    handler: async (ctx) => resolveActiveAdminShopId(ctx),
});

/**
 * Hand-built module map for `convex-test` (see `lib/auth.test.ts` for the full rationale): Biome forbids
 * exporting fixtures from a test file and the default glob excludes the self-importing module, so the
 * fixtures are mapped to this module's path to resolve by `FunctionReference`.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/auth/admin_shop_resolver.test.ts': () =>
        Promise.resolve({ seedCollaborator, seedForeignShop, resolveActiveShopIdFixture }),
};

const seedCollaboratorRef = makeFunctionReference<'mutation'>('auth/admin_shop_resolver.test:seedCollaborator');
const seedForeignShopRef = makeFunctionReference<'mutation'>('auth/admin_shop_resolver.test:seedForeignShop');
const resolveActiveShopIdRef = makeFunctionReference<'query'>(
    'auth/admin_shop_resolver.test:resolveActiveShopIdFixture',
);

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('resolveActiveAdminShopId', () => {
    it('falls back to the lone membership when the identity carries no active-tenant selection', async () => {
        const t = convexTest(schema, modules);
        const { shops } = await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 1 });

        const asOperator = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'github|1',
            email: 'operator@example.com',
        });

        await expect(asOperator.query(resolveActiveShopIdRef, {})).resolves.toBe(shops[0]?.shopId);
    });

    it('rejects a multi-shop operator with no selection as ambiguous', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 2 });

        const asOperator = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'github|1',
            email: 'operator@example.com',
        });

        await expect(asOperator.query(resolveActiveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.AMBIGUOUS_SHOP_MEMBERSHIP },
        });
    });

    it('resolves the selected tenant among many from the server-trusted claim, never a client arg', async () => {
        const t = convexTest(schema, modules);
        const { shops } = await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 3 });

        const asOperator = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'github|1',
            email: 'operator@example.com',
            [ACTIVE_SHOP_CLAIM]: 'shop_1',
        });

        await expect(asOperator.query(resolveActiveShopIdRef, {})).resolves.toBe(shops[1]?.shopId);
    });

    it('refuses a selection naming a real shop the operator does not collaborate on', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 1 });
        const foreignLegacyId = await t.mutation(seedForeignShopRef, { legacyId: 'foreign_shop' });

        const asOperator = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'github|1',
            email: 'operator@example.com',
            [ACTIVE_SHOP_CLAIM]: foreignLegacyId,
        });

        await expect(asOperator.query(resolveActiveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AdminShopResolverErrorCode.ACTIVE_SHOP_FORBIDDEN },
        });
    });

    it('rejects a selection that resolves to no shop', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedCollaboratorRef, { email: 'operator@example.com', shopCount: 1 });

        const asOperator = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'github|1',
            email: 'operator@example.com',
            [ACTIVE_SHOP_CLAIM]: 'does_not_exist',
        });

        await expect(asOperator.query(resolveActiveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AdminShopResolverErrorCode.ACTIVE_SHOP_UNKNOWN },
        });
    });

    it('rejects an unauthenticated request before any selection is read', async () => {
        const t = convexTest(schema, modules);

        await expect(t.query(resolveActiveShopIdRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNAUTHENTICATED },
        });
    });
});
