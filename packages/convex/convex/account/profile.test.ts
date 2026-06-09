import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthErrorCode } from '../lib/auth';
import { systemMutation } from '../lib/system';
import schema from '../schema';
import * as profile from './profile';

/**
 * The trusted NextAuth issuer (`CONVEX_AUTH_ISSUER`) stubbed for every case so the
 * `getTrustedIdentity` issuer re-assertion is active under `convex-test`, whose `withIdentity`
 * fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://storefront.test.nordcom.io';

/**
 * Seeds a platform user plus one shop with a `shopCollaborators` row linking them, so the
 * `tenantQuery` constructor's identity → user → membership chain resolves end to end. Written
 * through the system tier's raw `ctx.db` because `users`/`shops`/`shopCollaborators` are
 * platform-global tables the system tier is sanctioned to write unscoped.
 */
const seedMember = systemMutation({
    args: { email: v.string(), legacyId: v.string() },
    handler: async (ctx, { email, legacyId }) => {
        const now = 1_700_000_000_000;
        const userId = await ctx.db.insert('users', {
            email,
            name: 'Seeded User',
            emailVerified: null,
            identities: [],
            createdAt: now,
            updatedAt: now,
        });
        const shopId = await ctx.db.insert('shops', {
            legacyId,
            name: `Shop ${legacyId}`,
            domain: `${legacyId}.example.com`,
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: legacyId } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: now,
            updatedAt: now,
        });
        await ctx.db.insert('shopCollaborators', { shop: shopId, user: userId, permissions: ['admin'] });
        return { userId, shopId };
    },
});

/**
 * Module map for `convex-test`: the REAL `account/profile` module at its deployed path (so the
 * wire name the storefront preloads — `account/profile:get` — resolves exactly as deployed) plus
 * this test file's seed fixture (see `lib/auth.test.ts` for the hand-built-map rationale).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/account/profile.ts': () => Promise.resolve(profile),
    '/convex/account/profile.test.ts': () => Promise.resolve({ seedMember }),
};

const seedMemberRef = makeFunctionReference<'mutation'>('account/profile.test:seedMember');

/** The exact wire name the storefront island's `accountProfileQueryReference()` addresses. */
const getProfileRef = makeFunctionReference<'query', Record<string, never>, profile.AccountProfile>(
    'account/profile:get',
);

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('account/profile:get', () => {
    it('returns the validated identity claims as the profile for a single-shop member', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedMemberRef, { email: 'jane@example.com', legacyId: 'shop_a' });

        const asJane = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'customer-1',
            email: 'jane@example.com',
            name: 'Jane Customer',
            pictureUrl: 'https://cdn.example.com/jane.png',
        });

        await expect(asJane.query(getProfileRef, {})).resolves.toEqual({
            id: 'customer-1',
            name: 'Jane Customer',
            email: 'jane@example.com',
            image: 'https://cdn.example.com/jane.png',
        });
    });

    it('normalizes absent display claims to null', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedMemberRef, { email: 'jane@example.com', legacyId: 'shop_a' });

        const asJane = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'jane@example.com',
            email: 'jane@example.com',
        });

        await expect(asJane.query(getProfileRef, {})).resolves.toEqual({
            id: 'jane@example.com',
            name: null,
            email: 'jane@example.com',
            image: null,
        });
    });

    it('rejects an unauthenticated request', async () => {
        const t = convexTest(schema, modules);

        await expect(t.query(getProfileRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNAUTHENTICATED },
        });
    });

    it('rejects an identity from an untrusted issuer as forged', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedMemberRef, { email: 'jane@example.com', legacyId: 'shop_a' });

        const asForged = t.withIdentity({
            issuer: 'https://evil.example.com',
            subject: 'customer-1',
            email: 'jane@example.com',
        });

        await expect(asForged.query(getProfileRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });
    });

    it('rejects a valid token whose email maps to no platform user (customer without a Convex row)', async () => {
        const t = convexTest(schema, modules);

        const asUnknown = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'customer-2',
            email: 'stranger@example.com',
        });

        await expect(asUnknown.query(getProfileRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNKNOWN_USER },
        });
    });

    it('denies cross-tenant reads: each identity gets only its own profile, and a no-membership identity is rejected', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedMemberRef, { email: 'a@example.com', legacyId: 'shop_a' });
        await t.mutation(seedMemberRef, { email: 'b@example.com', legacyId: 'shop_b' });
        // A user row WITHOUT any shopCollaborators membership: tenant resolution must refuse it.
        await t.run(async (ctx) => {
            const now = 1_700_000_000_000;
            await ctx.db.insert('users', {
                email: 'floating@example.com',
                name: 'No Membership',
                emailVerified: null,
                identities: [],
                createdAt: now,
                updatedAt: now,
            });
        });

        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'user-a', email: 'a@example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'user-b', email: 'b@example.com' });
        const asFloating = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'user-c',
            email: 'floating@example.com',
        });

        const profileA = await asA.query(getProfileRef, {});
        const profileB = await asB.query(getProfileRef, {});

        expect(profileA.email).toBe('a@example.com');
        expect(profileB.email).toBe('b@example.com');
        expect(profileA.email).not.toBe(profileB.email);
        await expect(asFloating.query(getProfileRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.NO_SHOP_MEMBERSHIP },
        });
    });
});
