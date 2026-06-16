import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import type { Doc } from '../_generated/dataModel';
import { systemMutation, systemQuery } from '../lib/system';
import schema from '../schema';
import {
    applyShopOrgBackfill,
    type PendingBackfillShop,
    pendingOrgBackfill,
    planShopOrgBackfill,
    stampShopClerkOrg,
} from './backfill';
import * as syncModule from './sync';

/** Fixed epoch-ms stamp shared by every seeded row so the seeds are deterministic across cases. */
const SEED_NOW = 1_700_000_000_000;

/**
 * Seeds a shop and returns its id, written through the system tier's raw `db` because `shops` is a
 * platform-global table the system tier is sanctioned to write unscoped. Carries the minimal required
 * `shopValidator` fields plus the optional `clerkOrgId` owner so a re-run can be modeled.
 *
 * @param ctx - A system-tier mutation context exposing the raw writer `db`.
 * @param key - A unique suffix disambiguating this shop's `legacyId`/`domain`/`name` from siblings.
 * @param clerkOrgId - The owning Clerk org id stamped onto the shop, or omitted for an un-backfilled shop.
 * @returns The inserted `shops` row id.
 */
const seedShop = systemMutation({
    args: { key: v.string(), clerkOrgId: v.optional(v.string()) },
    handler: async (ctx, { key, clerkOrgId }) => {
        return ctx.db.insert('shops', {
            legacyId: `shop_${key}`,
            name: `Shop ${key}`,
            domain: `shop-${key}.example.com`,
            clerkOrgId,
            design: {
                header: { logo: { width: 512, height: 512, src: 'https://cdn/logo.png', alt: `Shop ${key}` } },
                accents: [],
            },
            commerceProvider: { type: 'stripe', authentication: {} },
            createdAt: SEED_NOW,
            updatedAt: SEED_NOW,
        });
    },
});

/**
 * Seeds a `users` row + its `shopCollaborators` grant on a shop, modeling an existing operator. When
 * `clerkUserId` is supplied the user is already linked to a Clerk account; when omitted the user has
 * no Clerk account yet (the invite-on-backfill path).
 *
 * @param ctx - A system-tier mutation context exposing the raw writer `db`.
 * @param email - The collaborator's email (the `by_email` link key).
 * @param shop - The shop the collaborator is granted on.
 * @param clerkUserId - The Clerk subject when the user already has an account; omitted otherwise.
 * @returns The inserted `users` row id.
 */
const seedCollaborator = systemMutation({
    args: {
        email: v.string(),
        shop: v.id('shops'),
        clerkUserId: v.optional(v.string()),
        permissions: v.optional(v.array(v.string())),
    },
    handler: async (ctx, { email, shop, clerkUserId, permissions }) => {
        const userId = await ctx.db.insert('users', {
            email,
            name: email,
            emailVerified: null,
            identities: [],
            clerkUserId,
            createdAt: SEED_NOW,
            updatedAt: SEED_NOW,
        });
        await ctx.db.insert('shopCollaborators', { shop, user: userId, permissions: permissions ?? ['admin'] });
        return userId;
    },
});

/** Reads every `orgs` row so cases assert the org mirror was (or was not) created. */
const readOrgs = systemQuery({
    args: {},
    handler: async (ctx) => ctx.db.query('orgs').collect(),
});

/** Reads every `orgMemberships` row so cases assert the membership mirror. */
const readMemberships = systemQuery({
    args: {},
    handler: async (ctx) => ctx.db.query('orgMemberships').collect(),
});

/** Reads a single shop row so cases assert whether `clerkOrgId` was stamped. */
const readShop = systemQuery({
    args: { shop: v.id('shops') },
    handler: async (ctx, { shop }) => ctx.db.get(shop),
});

/** Reads every `shopCollaborators` row so cases assert the projection. */
const readCollaborators = systemQuery({
    args: {},
    handler: async (ctx) => ctx.db.query('shopCollaborators').collect(),
});

/**
 * Hand-built `convex-test` module map. Biome forbids exporting fixtures from a test file and the
 * default glob excludes the self-importing module, so the production internal functions under test
 * (re-exported here) plus the local seed/read fixtures are mapped to this module's path and invoked
 * by `FunctionReference` — the supported path that runs the real constructors end to end. The
 * cross-module `clerk/sync` projection import is mapped at its deployed path so it resolves exactly
 * as deployed.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/clerk/sync.ts': () => Promise.resolve(syncModule),
    '/convex/clerk/backfill.test.ts': () =>
        Promise.resolve({
            pendingOrgBackfill,
            applyShopOrgBackfill,
            stampShopClerkOrg,
            seedShop,
            seedCollaborator,
            readOrgs,
            readMemberships,
            readShop,
            readCollaborators,
        }),
};

const pendingRef = makeFunctionReference<'query', Record<string, never>, PendingBackfillShop[]>(
    'clerk/backfill.test:pendingOrgBackfill',
);
const applyRef = makeFunctionReference<'mutation'>('clerk/backfill.test:applyShopOrgBackfill');
const stampRef = makeFunctionReference<'mutation'>('clerk/backfill.test:stampShopClerkOrg');
const seedShopRef = makeFunctionReference<'mutation', { key: string; clerkOrgId?: string }, string>(
    'clerk/backfill.test:seedShop',
);
const seedCollaboratorRef = makeFunctionReference<
    'mutation',
    { email: string; shop: string; clerkUserId?: string; permissions?: string[] },
    string
>('clerk/backfill.test:seedCollaborator');
const readOrgsRef = makeFunctionReference<'query', Record<string, never>, Doc<'orgs'>[]>(
    'clerk/backfill.test:readOrgs',
);
const readMembershipsRef = makeFunctionReference<'query', Record<string, never>, Doc<'orgMemberships'>[]>(
    'clerk/backfill.test:readMemberships',
);
const readShopRef = makeFunctionReference<'query', { shop: string }, Doc<'shops'> | null>(
    'clerk/backfill.test:readShop',
);
const readCollaboratorsRef = makeFunctionReference<'query', Record<string, never>, Doc<'shopCollaborators'>[]>(
    'clerk/backfill.test:readCollaborators',
);

describe('clerk/backfill — planShopOrgBackfill (pure planner)', () => {
    it('derives a deterministic org slug + name from the shop domain', () => {
        const plan = planShopOrgBackfill({
            shopName: 'Acme Storefront',
            domain: 'shop.acme.com',
            collaborators: [],
        });
        expect(plan.orgName).toBe('Acme Storefront');
        expect(plan.orgSlug).toBe('shop-acme-com');
    });

    it('partitions collaborators into linked (member) vs unlinked (invite) by clerkUserId', () => {
        const plan = planShopOrgBackfill({
            shopName: 'Acme',
            domain: 'acme.com',
            collaborators: [
                { userId: 'u_linked' as never, email: 'linked@acme.com', clerkUserId: 'user_a' },
                { userId: 'u_unlinked' as never, email: 'unlinked@acme.com', clerkUserId: undefined },
            ],
        });
        expect(plan.members).toEqual([{ userId: 'u_linked', email: 'linked@acme.com', clerkUserId: 'user_a' }]);
        expect(plan.invites).toEqual([{ userId: 'u_unlinked', email: 'unlinked@acme.com' }]);
    });

    it('marks the shop deferred (do NOT stamp clerkOrgId) when any collaborator is unlinked', () => {
        const deferred = planShopOrgBackfill({
            shopName: 'Acme',
            domain: 'acme.com',
            collaborators: [{ userId: 'u' as never, email: 'a@acme.com', clerkUserId: undefined }],
        });
        expect(deferred.stampClerkOrgId).toBe(false);

        const complete = planShopOrgBackfill({
            shopName: 'Acme',
            domain: 'acme.com',
            collaborators: [{ userId: 'u' as never, email: 'a@acme.com', clerkUserId: 'user_a' }],
        });
        expect(complete.stampClerkOrgId).toBe(true);
    });

    it('stamps a shop with zero collaborators (no one to lock out)', () => {
        const plan = planShopOrgBackfill({ shopName: 'Empty', domain: 'empty.com', collaborators: [] });
        expect(plan.stampClerkOrgId).toBe(true);
    });
});

describe('clerk/backfill — pendingOrgBackfill (planning query)', () => {
    it('returns only shops WITHOUT clerkOrgId, each with its collaborators + clerkUserId presence', async () => {
        const t = convexTest(schema, modules);
        const pendingShop = await t.mutation(seedShopRef, { key: 'pending' });
        const doneShop = await t.mutation(seedShopRef, { key: 'done', clerkOrgId: 'org_done' });
        await t.mutation(seedCollaboratorRef, { email: 'linked@acme.com', shop: pendingShop, clerkUserId: 'user_a' });
        await t.mutation(seedCollaboratorRef, { email: 'unlinked@acme.com', shop: pendingShop });
        await t.mutation(seedCollaboratorRef, { email: 'other@done.com', shop: doneShop, clerkUserId: 'user_b' });

        const plan = await t.query(pendingRef, {});
        expect(plan).toHaveLength(1);
        const entry = plan[0];
        expect(entry?.shopId).toBe(pendingShop);
        expect(entry?.domain).toBe('shop-pending.example.com');
        expect(entry?.name).toBe('Shop pending');
        const byEmail = Object.fromEntries((entry?.collaborators ?? []).map((c) => [c.email, c.hasClerkAccount]));
        expect(byEmail).toEqual({ 'linked@acme.com': true, 'unlinked@acme.com': false });
    });

    it('returns an empty plan when every shop already has clerkOrgId', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedShopRef, { key: 'a', clerkOrgId: 'org_a' });
        await t.mutation(seedShopRef, { key: 'b', clerkOrgId: 'org_b' });
        expect(await t.query(pendingRef, {})).toEqual([]);
    });
});

describe('clerk/backfill — applyShopOrgBackfill (idempotent mirror writer)', () => {
    it('mirrors org + linked memberships + projects shopCollaborators, and STAMPS when all are linked', async () => {
        const t = convexTest(schema, modules);
        const shop = await t.mutation(seedShopRef, { key: 'acme' });
        const linkedUser = await t.mutation(seedCollaboratorRef, {
            email: 'linked@acme.com',
            shop,
            clerkUserId: 'user_a',
        });

        await t.mutation(applyRef, {
            shopId: shop,
            clerkOrgId: 'org_acme',
            orgName: 'Shop acme',
            orgSlug: 'shop-acme-example-com',
            members: [{ userId: linkedUser, clerkUserId: 'user_a', role: 'org:admin' }],
            stampClerkOrgId: true,
        });

        const orgs = await t.query(readOrgsRef, {});
        expect(orgs).toHaveLength(1);
        expect(orgs[0]?.clerkOrgId).toBe('org_acme');
        expect(orgs[0]?.slug).toBe('shop-acme-example-com');

        const memberships = await t.query(readMembershipsRef, {});
        expect(memberships).toHaveLength(1);
        expect(memberships[0]?.user).toBe(linkedUser);
        expect(memberships[0]?.clerkOrgId).toBe('org_acme');

        const stamped = await t.query(readShopRef, { shop });
        expect(stamped?.clerkOrgId).toBe('org_acme');

        const collaborators = await t.query(readCollaboratorsRef, {});
        expect(collaborators).toHaveLength(1);
        expect(collaborators[0]?.user).toBe(linkedUser);
        expect(collaborators[0]?.permissions).toEqual(['admin']);
    });

    it('does NOT stamp clerkOrgId when an unlinked collaborator remains (no lockout), but still mirrors the org + linked member', async () => {
        const t = convexTest(schema, modules);
        const shop = await t.mutation(seedShopRef, { key: 'acme' });
        const linkedUser = await t.mutation(seedCollaboratorRef, {
            email: 'linked@acme.com',
            shop,
            clerkUserId: 'user_a',
        });
        await t.mutation(seedCollaboratorRef, { email: 'unlinked@acme.com', shop });

        await t.mutation(applyRef, {
            shopId: shop,
            clerkOrgId: 'org_acme',
            orgName: 'Shop acme',
            orgSlug: 'shop-acme-example-com',
            members: [{ userId: linkedUser, clerkUserId: 'user_a', role: 'org:admin' }],
            stampClerkOrgId: false,
        });

        const stamped = await t.query(readShopRef, { shop });
        expect(stamped?.clerkOrgId).toBeUndefined();
        // The org + linked membership are still mirrored so the linked operator has access the instant
        // the deferred shop is later stamped (on a re-run after the unlinked user accepts).
        expect(await t.query(readOrgsRef, {})).toHaveLength(1);
        expect(await t.query(readMembershipsRef, {})).toHaveLength(1);
        // No collaborator projection yet for the linked user on an unstamped shop is fine either way;
        // the projection derives from membership × owned shops, and the shop has clerkOrgId only once
        // stamped. The linked member keeps access through the existing pre-Clerk row regardless.
    });

    it('is idempotent — a second apply adds no duplicate org, membership, or collaborator rows', async () => {
        const t = convexTest(schema, modules);
        const shop = await t.mutation(seedShopRef, { key: 'acme' });
        const linkedUser = await t.mutation(seedCollaboratorRef, {
            email: 'linked@acme.com',
            shop,
            clerkUserId: 'user_a',
        });

        const args = {
            shopId: shop,
            clerkOrgId: 'org_acme',
            orgName: 'Shop acme',
            orgSlug: 'shop-acme-example-com',
            members: [{ userId: linkedUser, clerkUserId: 'user_a', role: 'org:admin' }],
            stampClerkOrgId: true,
        };
        await t.mutation(applyRef, args);
        await t.mutation(applyRef, args);

        expect(await t.query(readOrgsRef, {})).toHaveLength(1);
        expect(await t.query(readMembershipsRef, {})).toHaveLength(1);
        expect(await t.query(readCollaboratorsRef, {})).toHaveLength(1);
    });

    it('preserves access for a Clerk-account collaborator: the projected shopCollaborators row survives', async () => {
        const t = convexTest(schema, modules);
        const shop = await t.mutation(seedShopRef, { key: 'acme' });
        const linkedUser = await t.mutation(seedCollaboratorRef, {
            email: 'linked@acme.com',
            shop,
            clerkUserId: 'user_a',
        });

        await t.mutation(applyRef, {
            shopId: shop,
            clerkOrgId: 'org_acme',
            orgName: 'Shop acme',
            orgSlug: 'shop-acme-example-com',
            members: [{ userId: linkedUser, clerkUserId: 'user_a', role: 'org:admin' }],
            stampClerkOrgId: true,
        });

        const collaborators = await t.query(readCollaboratorsRef, {});
        const own = collaborators.filter((row) => row.user === linkedUser && row.shop === shop);
        expect(own).toHaveLength(1);
        expect(own[0]?.permissions).toEqual(['admin']);
    });
});

describe('clerk/backfill — stampShopClerkOrg (deferred completion)', () => {
    it('stamps a previously-deferred shop once its operators are all linked, with no duplicate org row', async () => {
        const t = convexTest(schema, modules);
        const shop = await t.mutation(seedShopRef, { key: 'acme' });
        const linkedUser = await t.mutation(seedCollaboratorRef, {
            email: 'linked@acme.com',
            shop,
            clerkUserId: 'user_a',
        });

        // First pass deferred (unlinked collaborator present): org mirrored, NOT stamped.
        await t.mutation(applyRef, {
            shopId: shop,
            clerkOrgId: 'org_acme',
            orgName: 'Shop acme',
            orgSlug: 'shop-acme-example-com',
            members: [{ userId: linkedUser, clerkUserId: 'user_a', role: 'org:admin' }],
            stampClerkOrgId: false,
        });
        expect((await t.query(readShopRef, { shop }))?.clerkOrgId).toBeUndefined();

        // Second pass: the deferred completion stamps it now that it is safe.
        await t.mutation(stampRef, { shopId: shop, clerkOrgId: 'org_acme' });
        expect((await t.query(readShopRef, { shop }))?.clerkOrgId).toBe('org_acme');
        expect(await t.query(readOrgsRef, {})).toHaveLength(1);

        // The projection now grants the linked operator the collaborator row for the stamped shop.
        const collaborators = await t.query(readCollaboratorsRef, {});
        expect(collaborators.filter((row) => row.user === linkedUser && row.shop === shop)).toHaveLength(1);
    });
});
