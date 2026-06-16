import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { systemMutation } from '../lib/system';
import schema from '../schema';
import * as chooser from './chooser';

/**
 * The Clerk issuer set into `CLERK_FRONTEND_API_URL` for every case so the Clerk-issuer check in
 * `getClerkOperatorIdentity` (which `clerkQuery` runs) is active under `convex-test`, whose
 * `withIdentity` fakes identities WITHOUT Convex's real signature/issuer validation. Matches the
 * pattern in `clerk/provisioning.test.ts`.
 */
const CLERK_ISSUER = 'https://clerk.test.nordcom.io';

/** Fixed epoch-ms stamp shared by every seeded row so the seeds are deterministic. */
const SEED_NOW = 1_700_000_000_000;

/**
 * Seeds an operator `users` row keyed on `(email, clerkUserId)` so the `clerkQuery` subject lookup
 * resolves it. Returns the new row id for downstream membership seeding.
 */
const seedUser = systemMutation({
    args: { email: v.string(), clerkUserId: v.string() },
    handler: async (ctx, { email, clerkUserId }) =>
        ctx.db.insert('users', {
            email,
            name: 'Operator',
            emailVerified: null,
            identities: [],
            clerkUserId,
            createdAt: SEED_NOW,
            updatedAt: SEED_NOW,
        }),
});

/** Seeds an `orgs` mirror row. Omitting it exercises the membership-outruns-org degrade path. */
const seedOrg = systemMutation({
    args: { clerkOrgId: v.string(), name: v.string() },
    handler: async (ctx, { clerkOrgId, name }) =>
        ctx.db.insert('orgs', {
            clerkOrgId,
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            imageUrl: 'https://cdn/org.png',
            createdAt: SEED_NOW,
            updatedAt: SEED_NOW,
        }),
});

/** Joins a user to an org via the `orgMemberships` mirror. */
const seedMembership = systemMutation({
    args: { clerkOrgId: v.string(), user: v.id('users'), clerkUserId: v.string() },
    handler: async (ctx, { clerkOrgId, user, clerkUserId }) =>
        ctx.db.insert('orgMemberships', {
            clerkOrgId,
            user,
            clerkUserId,
            role: 'org:admin',
            createdAt: SEED_NOW,
        }),
});

/** Seeds a shop owned by an org (`shops.clerkOrgId`). */
const seedShop = systemMutation({
    args: { clerkOrgId: v.string(), name: v.string(), domain: v.string() },
    handler: async (ctx, { clerkOrgId, name, domain }) =>
        ctx.db.insert('shops', {
            legacyId: `shop_${domain}`,
            name,
            domain,
            clerkOrgId,
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: name } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: SEED_NOW,
            updatedAt: SEED_NOW,
        }),
});

const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/orgs/chooser.ts': () => Promise.resolve(chooser),
    '/convex/orgs/chooser.test.ts': () => Promise.resolve({ seedUser, seedOrg, seedMembership, seedShop }),
};

const listForOperatorRef = makeFunctionReference<'query', Record<string, never>, chooser.ChooserOrg[]>(
    'orgs/chooser:listForOperator',
);
const seedUserRef = makeFunctionReference<'mutation', { email: string; clerkUserId: string }>(
    'orgs/chooser.test:seedUser',
);
const seedOrgRef = makeFunctionReference<'mutation', { clerkOrgId: string; name: string }>('orgs/chooser.test:seedOrg');
const seedMembershipRef = makeFunctionReference<'mutation', { clerkOrgId: string; user: string; clerkUserId: string }>(
    'orgs/chooser.test:seedMembership',
);
const seedShopRef = makeFunctionReference<'mutation', { clerkOrgId: string; name: string; domain: string }>(
    'orgs/chooser.test:seedShop',
);

beforeEach(() => {
    vi.stubEnv('CLERK_FRONTEND_API_URL', CLERK_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('listForOperator', () => {
    it('lists every org the operator belongs to, each with its owned shops, alphabetized', async () => {
        const t = convexTest(schema, modules);
        const user = await t.mutation(seedUserRef, { email: 'op@example.com', clerkUserId: 'user_op' });
        await t.mutation(seedOrgRef, { clerkOrgId: 'org_b', name: 'Beta Org' });
        await t.mutation(seedOrgRef, { clerkOrgId: 'org_a', name: 'Acme Org' });
        await t.mutation(seedMembershipRef, { clerkOrgId: 'org_b', user, clerkUserId: 'user_op' });
        await t.mutation(seedMembershipRef, { clerkOrgId: 'org_a', user, clerkUserId: 'user_op' });
        await t.mutation(seedShopRef, { clerkOrgId: 'org_a', name: 'Zebra', domain: 'zebra.example.com' });
        await t.mutation(seedShopRef, { clerkOrgId: 'org_a', name: 'Apple', domain: 'apple.example.com' });
        await t.mutation(seedShopRef, { clerkOrgId: 'org_b', name: 'Solo', domain: 'solo.example.com' });

        const asOp = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_op', email: 'op@example.com' });
        const result = await asOp.query(listForOperatorRef, {});

        expect(result.map((org) => org.name)).toEqual(['Acme Org', 'Beta Org']);
        expect(result[0]?.shops.map((shop) => shop.name)).toEqual(['Apple', 'Zebra']);
        expect(result[1]?.shops).toEqual([{ name: 'Solo', domain: 'solo.example.com' }]);
    });

    it('returns an empty list for an operator with no org memberships', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'lonely@example.com', clerkUserId: 'user_lonely' });

        const asOp = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_lonely', email: 'lonely@example.com' });
        const result = await asOp.query(listForOperatorRef, {});

        expect(result).toEqual([]);
    });

    it('degrades to the org id as the display name when the org mirror has not synced yet', async () => {
        const t = convexTest(schema, modules);
        const user = await t.mutation(seedUserRef, { email: 'early@example.com', clerkUserId: 'user_early' });
        // Membership arrives before the org webhook — no `orgs` row exists for `org_pending`.
        await t.mutation(seedMembershipRef, { clerkOrgId: 'org_pending', user, clerkUserId: 'user_early' });
        await t.mutation(seedShopRef, {
            clerkOrgId: 'org_pending',
            name: 'Pending Shop',
            domain: 'pending.example.com',
        });

        const asOp = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_early', email: 'early@example.com' });
        const result = await asOp.query(listForOperatorRef, {});

        expect(result).toHaveLength(1);
        expect(result[0]?.name).toBe('org_pending');
        expect(result[0]?.imageUrl).toBeNull();
        expect(result[0]?.shops).toEqual([{ name: 'Pending Shop', domain: 'pending.example.com' }]);
    });

    it('returns an empty list for an un-provisioned operator (no users row yet)', async () => {
        const t = convexTest(schema, modules);
        // No `users` row seeded — the webhook / ensureCurrentUser hasn't landed at first paint. The
        // identity validates but resolveUserFromIdentity would throw UNKNOWN_USER; the chooser swallows
        // it and shows the empty state instead of crashing.
        const asNew = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_unprovisioned', email: 'new@example.com' });
        const result = await asNew.query(listForOperatorRef, {});

        expect(result).toEqual([]);
    });

    it('still rejects a forged (wrong-issuer) identity rather than masking it as empty', async () => {
        const t = convexTest(schema, modules);
        const asForged = t.withIdentity({
            issuer: 'https://evil.example.com',
            subject: 'user_x',
            email: 'x@example.com',
        });
        await expect(asForged.query(listForOperatorRef, {})).rejects.toMatchObject({
            data: { code: 'FORGED_IDENTITY' },
        });
    });

    it("does not leak another operator's orgs", async () => {
        const t = convexTest(schema, modules);
        const mine = await t.mutation(seedUserRef, { email: 'mine@example.com', clerkUserId: 'user_mine' });
        const other = await t.mutation(seedUserRef, { email: 'other@example.com', clerkUserId: 'user_other' });
        await t.mutation(seedOrgRef, { clerkOrgId: 'org_mine', name: 'Mine Org' });
        await t.mutation(seedOrgRef, { clerkOrgId: 'org_other', name: 'Other Org' });
        await t.mutation(seedMembershipRef, { clerkOrgId: 'org_mine', user: mine, clerkUserId: 'user_mine' });
        await t.mutation(seedMembershipRef, { clerkOrgId: 'org_other', user: other, clerkUserId: 'user_other' });

        const asMine = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_mine', email: 'mine@example.com' });
        const result = await asMine.query(listForOperatorRef, {});

        expect(result.map((org) => org.name)).toEqual(['Mine Org']);
    });
});
