import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthErrorCode } from '../lib/auth';
import { systemMutation } from '../lib/system';
import { tenantQuery } from '../lib/tenant';
import schema from '../schema';
import * as profile from './profile';

/**
 * The trusted NextAuth issuer (`CONVEX_AUTH_ISSUER`) stubbed for every case so the
 * `getTrustedIdentity` issuer re-assertion is active under `convex-test`, whose `withIdentity`
 * fakes identities WITHOUT Convex's real signature/issuer validation.
 */
const TRUSTED_ISSUER = 'https://storefront.test.nordcom.io';

/**
 * Seeds a platform user directly (the row the admin's Auth.js adapter would have created), so the
 * already-provisioned paths can be exercised without going through `provision`. Written through
 * the system tier's raw `ctx.db` because `users` is a platform-global table the system tier is
 * sanctioned to write unscoped.
 */
const seedUser = systemMutation({
    args: { email: v.string(), name: v.string() },
    handler: async (ctx, { email, name }) => {
        const now = 1_700_000_000_000;
        return ctx.db.insert('users', {
            email,
            name,
            emailVerified: null,
            identities: [],
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Counts the `users` rows carrying an email — the idempotency/concurrency assertion target for
 * `provision` (exactly one row per email, ever).
 */
const countUsersByEmail = systemMutation({
    args: { email: v.string() },
    handler: async (ctx, { email }) => {
        const rows = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', email))
            .collect();
        return rows.length;
    },
});

/**
 * A `tenantQuery` fixture standing in for any operator-tier function. Customers — provisioned or
 * not — must keep failing the tenant tier's collaborator-membership chain: provisioning a `users`
 * row must NOT be a path into operator-tier tenant access.
 */
const tenantProbe = tenantQuery({
    args: {},
    handler: async (ctx) => ctx.shopId,
});

/**
 * Module map for `convex-test`: the REAL `account/profile` module at its deployed path (so the
 * wire names the storefront addresses — `account/profile:get` / `account/profile:provision` —
 * resolve exactly as deployed) plus this test file's fixtures (see `lib/auth.test.ts` for the
 * hand-built-map rationale).
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/account/profile.ts': () => Promise.resolve(profile),
    '/convex/account/profile.test.ts': () => Promise.resolve({ seedUser, countUsersByEmail, tenantProbe }),
};

const seedUserRef = makeFunctionReference<'mutation'>('account/profile.test:seedUser');
const countUsersRef = makeFunctionReference<'mutation', { email: string }, number>(
    'account/profile.test:countUsersByEmail',
);
const tenantProbeRef = makeFunctionReference<'query'>('account/profile.test:tenantProbe');

/** The exact wire name the storefront island's `accountProfileQueryReference()` addresses. */
const getProfileRef = makeFunctionReference<'query', Record<string, never>, profile.AccountProfile>(
    'account/profile:get',
);

/** The exact wire name the storefront's `accountProfileProvisionReference()` addresses. */
const provisionRef = makeFunctionReference<'mutation', Record<string, never>, profile.ProvisionResult>(
    'account/profile:provision',
);

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('account/profile:get', () => {
    it('serves the validated identity claims live for a customer with a users row and NO shop membership', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'jane@example.com', name: 'Jane Customer' });

        const asJane = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'customer-1',
            email: 'jane@example.com',
            name: 'Jane Customer',
            pictureUrl: 'https://cdn.example.com/jane.png',
        });

        // No `shopCollaborators` row exists: the customer provenance keys on the users row alone,
        // which is exactly what un-blocks storefront customers the tenant tier rejected.
        await expect(asJane.query(getProfileRef, {})).resolves.toEqual({
            id: 'customer-1',
            name: 'Jane Customer',
            email: 'jane@example.com',
            image: 'https://cdn.example.com/jane.png',
        });
    });

    it('normalizes absent display claims to null', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'jane@example.com', name: 'Jane Customer' });

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
        await t.mutation(seedUserRef, { email: 'jane@example.com', name: 'Jane Customer' });

        const asForged = t.withIdentity({
            issuer: 'https://evil.example.com',
            subject: 'customer-1',
            email: 'jane@example.com',
        });

        await expect(asForged.query(getProfileRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });
    });

    it('rejects a valid token whose email maps to no platform user (not-yet-provisioned customer)', async () => {
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

    it('keeps profiles caller-scoped: each identity reads only its own claims', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'a@example.com', name: 'Customer A' });
        await t.mutation(seedUserRef, { email: 'b@example.com', name: 'Customer B' });

        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'user-a', email: 'a@example.com' });
        const asB = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'user-b', email: 'b@example.com' });

        const profileA = await asA.query(getProfileRef, {});
        const profileB = await asB.query(getProfileRef, {});

        expect(profileA.email).toBe('a@example.com');
        expect(profileB.email).toBe('b@example.com');
        expect(profileA.email).not.toBe(profileB.email);
    });
});

describe('account/profile:provision', () => {
    it('provisions the users row from the trusted claims and the profile then serves live (round-trip)', async () => {
        const t = convexTest(schema, modules);

        const asNew = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'customer-3',
            email: 'new@example.com',
            name: 'New Customer',
            pictureUrl: 'https://cdn.example.com/new.png',
        });

        // Before: the not-yet-provisioned customer is rejected and the island stays on its snapshot.
        await expect(asNew.query(getProfileRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNKNOWN_USER },
        });

        await expect(asNew.mutation(provisionRef, {})).resolves.toEqual({ created: true });

        // After: the same token's profile read serves live, claims-shaped.
        await expect(asNew.query(getProfileRef, {})).resolves.toEqual({
            id: 'customer-3',
            name: 'New Customer',
            email: 'new@example.com',
            image: 'https://cdn.example.com/new.png',
        });

        // The row was keyed by the TRUSTED email claim and carries the token's display claims.
        await t.run(async (ctx) => {
            const rows = await ctx.db.query('users').collect();
            const row = rows.find((candidate) => candidate.email === 'new@example.com');
            expect(row).toMatchObject({ name: 'New Customer', avatar: 'https://cdn.example.com/new.png' });
        });
    });

    it('is idempotent under concurrent first visits: exactly one row per email', async () => {
        const t = convexTest(schema, modules);

        const asNew = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'customer-4', email: 'race@example.com' });

        await Promise.all([
            asNew.mutation(provisionRef, {}),
            asNew.mutation(provisionRef, {}),
            asNew.mutation(provisionRef, {}),
        ]);

        await expect(t.mutation(countUsersRef, { email: 'race@example.com' })).resolves.toBe(1);

        // A later visit finds the row and provisions nothing.
        await expect(asNew.mutation(provisionRef, {})).resolves.toEqual({ created: false });
        await expect(t.mutation(countUsersRef, { email: 'race@example.com' })).resolves.toBe(1);
    });

    it('leaves a pre-existing (adapter-created) row untouched instead of overwriting it with claims', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'op@example.com', name: 'Operator Name' });

        const asOp = t.withIdentity({
            issuer: TRUSTED_ISSUER,
            subject: 'customer-5',
            email: 'op@example.com',
            name: 'Customer-Claimed Name',
        });

        await expect(asOp.mutation(provisionRef, {})).resolves.toEqual({ created: false });

        await t.run(async (ctx) => {
            const rows = await ctx.db.query('users').collect();
            const row = rows.find((candidate) => candidate.email === 'op@example.com');
            expect(row?.name).toBe('Operator Name');
        });
    });

    it('rejects unauthenticated, forged-issuer, and email-less identities (unchanged auth gate)', async () => {
        const t = convexTest(schema, modules);

        await expect(t.mutation(provisionRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNAUTHENTICATED },
        });

        const asForged = t.withIdentity({
            issuer: 'https://evil.example.com',
            subject: 'customer-6',
            email: 'forged@example.com',
        });
        await expect(asForged.mutation(provisionRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });

        const asEmailless = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'customer-7' });
        await expect(asEmailless.mutation(provisionRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.IDENTITY_WITHOUT_EMAIL },
        });
    });

    it('does NOT widen tenant access: a provisioned customer still fails the tenant tier', async () => {
        const t = convexTest(schema, modules);

        const asNew = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'customer-8', email: 'cust@example.com' });
        await asNew.mutation(provisionRef, {});

        // The users row exists now, but with no `shopCollaborators` membership the tenant
        // constructors keep rejecting — provisioning grants the profile read, nothing more.
        await expect(asNew.query(tenantProbeRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.NO_SHOP_MEMBERSHIP },
        });
    });
});
