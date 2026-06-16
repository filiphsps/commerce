import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authedMutation, authedQuery, systemMutation } from '../_constructors';
import schema from '../schema';
import { AuthErrorCode } from './auth';
import { customerRules } from './rls';

/**
 * G1-style coverage for the CUSTOMER tier (`authedQuery`/`authedMutation`): the
 * identity-bearing-but-tenant-less constructors must expose exactly one row — the caller's own
 * email-keyed `users` row — and deny EVERYTHING else (every tenant table, every other
 * platform-global table, every other user's row) under deny-default with total table coverage.
 * The sibling `__tests__/rls-deny-default.test.ts` pins the tenant tier; this suite pins that the
 * customer tier opened for storefront customers (POLISH-04) introduces no new tenant-tier hole.
 */

/** The trusted NextAuth issuer, stubbed so the issuer re-assertion is active under `convex-test`. */
const TRUSTED_ISSUER = 'https://storefront.test.nordcom.io';

/** Fixed epoch-ms stamp for seeded rows' managed timestamps; the value itself is irrelevant. */
const NOW = 1_700_000_000_000;

/**
 * Seeds two customers' `users` rows plus one full tenant (shop + review) through the system
 * tier's sanctioned raw `ctx.db`, giving the deny assertions real rows to NOT see.
 */
const seedWorld = systemMutation({
    args: { emailA: v.string(), emailB: v.string() },
    handler: async (ctx, { emailA, emailB }) => {
        const insertUser = (email: string) =>
            ctx.db.insert('users', {
                email,
                name: `User ${email}`,
                emailVerified: null,
                identities: [],
                createdAt: NOW,
                updatedAt: NOW,
            });
        const userAId = await insertUser(emailA);
        const userBId = await insertUser(emailB);
        const shopId = await ctx.db.insert('shops', {
            legacyId: 'shop_a',
            name: 'Shop A',
            domain: 'a.example.com',
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: 'shop_a' } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: NOW,
            updatedAt: NOW,
        });
        const reviewId = await ctx.db.insert('reviews', { shopId, createdAt: NOW, updatedAt: NOW });
        return { userAId, userBId, shopId, reviewId };
    },
});

/**
 * An {@link authedQuery} fixture scanning the tables a customer must NOT see: other tenants'
 * `shops`/`reviews`. Both must read EMPTY, and the `users` scan must surface ONLY the caller's own row
 * despite the unbounded scan.
 */
const scanFixture = authedQuery({
    args: {},
    handler: async (ctx) => ({
        identityEmail: ctx.identityEmail,
        users: (await ctx.db.query('users').collect()).map((row) => row.email),
        shops: (await ctx.db.query('shops').collect()).length,
        reviews: (await ctx.db.query('reviews').collect()).length,
    }),
});

/**
 * An {@link authedQuery} fixture fetching foreign rows by BARE id through the customer-wrapped
 * reader — the inference-bypass probe (see the tenant suite). Every fetch must come back `null`.
 */
const bareIdFixture = authedQuery({
    args: { userId: v.id('users'), shopId: v.id('shops'), reviewId: v.id('reviews') },
    handler: async (ctx, { userId, shopId, reviewId }) => ({
        user: await ctx.db.get(userId),
        shop: await ctx.db.get(shopId),
        review: await ctx.db.get(reviewId),
    }),
});

/**
 * An {@link authedMutation} fixture patching an arbitrary `users` row by id. With a FOREIGN
 * user's id it must die on the re-checked read predicate, never touch the row.
 */
const patchUserFixture = authedMutation({
    args: { userId: v.id('users') },
    handler: async (ctx, { userId }) => ctx.db.patch(userId, { updatedAt: NOW + 1 }),
});

/**
 * An {@link authedMutation} fixture inserting a `users` row with an EXPLICIT email — used to
 * prove the insert predicate pins rows to the caller's own claim and rejects a forged email.
 */
const insertUserFixture = authedMutation({
    args: { email: v.string() },
    handler: async (ctx, { email }) =>
        ctx.db.insert('users', {
            email,
            name: 'Inserted',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        }),
});

/**
 * An {@link authedMutation} fixture writing into a tenant table (`reviews`) through the
 * customer-wrapped writer. Must ALWAYS reject — the customer tier has no tenant reach.
 */
const insertReviewFixture = authedMutation({
    args: { shopId: v.id('shops') },
    handler: async (ctx, { shopId }) => ctx.db.insert('reviews', { shopId, createdAt: NOW, updatedAt: NOW }),
});

/**
 * Hand-built module map for `convex-test` (see `lib/auth.test.ts` for the rationale): the
 * fixtures are mapped to this module's path so they resolve by `FunctionReference` and run the
 * REAL constructors end to end.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/lib/authed.test.ts': () =>
        Promise.resolve({
            seedWorld,
            scanFixture,
            bareIdFixture,
            patchUserFixture,
            insertUserFixture,
            insertReviewFixture,
        }),
};

const seedWorldRef = makeFunctionReference<'mutation'>('lib/authed.test:seedWorld');
const scanRef = makeFunctionReference<'query'>('lib/authed.test:scanFixture');
const bareIdRef = makeFunctionReference<'query'>('lib/authed.test:bareIdFixture');
const patchUserRef = makeFunctionReference<'mutation'>('lib/authed.test:patchUserFixture');
const insertUserRef = makeFunctionReference<'mutation'>('lib/authed.test:insertUserFixture');
const insertReviewRef = makeFunctionReference<'mutation'>('lib/authed.test:insertReviewFixture');

/**
 * Boots a fresh in-memory backend, seeds the two-customer/one-tenant world, and returns the
 * harness plus customer A's identity-bound accessor.
 *
 * @returns The harness, the seeded ids, and customer A's accessor.
 */
async function setUpWorld() {
    const t = convexTest(schema, modules);
    const seeded = await t.mutation(seedWorldRef, { emailA: 'a@example.com', emailB: 'b@example.com' });
    const asCustomerA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'cust|a', email: 'a@example.com' });
    return { t, ...seeded, asCustomerA };
}

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('customer tier: deny-default coverage', () => {
    it('covers every schema table with a rule so bare-id table inference is total', () => {
        const rules = customerRules('a@example.com');

        // Sorted-equality (the G1 pattern): a table missing from the rule map would reopen the
        // bare-id bypass, and a rule for a nonexistent table signals schema drift.
        expect(Object.keys(rules).sort()).toEqual(Object.keys(schema.tables).sort());
    });

    it("exposes only the caller's own users row; every other table reads empty", async () => {
        const { asCustomerA } = await setUpWorld();

        await expect(asCustomerA.query(scanRef, {})).resolves.toEqual({
            identityEmail: 'a@example.com',
            users: ['a@example.com'],
            shops: 0,
            reviews: 0,
        });
    });

    it('denies bare-id reads of a foreign user and of tenant rows', async () => {
        const { userBId, shopId, reviewId, asCustomerA } = await setUpWorld();

        await expect(asCustomerA.query(bareIdRef, { userId: userBId, shopId, reviewId })).resolves.toEqual({
            user: null,
            shop: null,
            review: null,
        });
    });
});

describe('customer tier: write scope', () => {
    it('lets a customer patch its own row but denies patching a foreign user', async () => {
        const { userAId, userBId, asCustomerA } = await setUpWorld();

        await expect(asCustomerA.mutation(patchUserRef, { userId: userAId })).resolves.toBeNull();
        await expect(asCustomerA.mutation(patchUserRef, { userId: userBId })).rejects.toThrow(
            'no read access or doc does not exist',
        );
    });

    it('denies inserting a users row carrying a foreign email (the provisioning forgery probe)', async () => {
        const { asCustomerA } = await setUpWorld();

        await expect(asCustomerA.mutation(insertUserRef, { email: 'victim@example.com' })).rejects.toThrow(
            'insert access not allowed',
        );
    });

    it('denies writes into tenant tables outright — no new tenant-tier hole', async () => {
        const { shopId, asCustomerA } = await setUpWorld();

        await expect(asCustomerA.mutation(insertReviewRef, { shopId })).rejects.toThrow('insert access not allowed');
    });
});

describe('customer tier: identity gate', () => {
    it('rejects unauthenticated, forged-issuer, and email-less callers at the constructor', async () => {
        const { t } = await setUpWorld();

        await expect(t.query(scanRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNAUTHENTICATED },
        });

        const asForged = t.withIdentity({ issuer: 'https://evil.example.com', email: 'a@example.com' });
        await expect(asForged.query(scanRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });

        const asEmailless = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'no-email' });
        await expect(asEmailless.query(scanRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.IDENTITY_WITHOUT_EMAIL },
        });
    });
});
