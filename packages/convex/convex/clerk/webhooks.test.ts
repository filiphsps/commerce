import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { assert, describe, expect, it } from 'vitest';
import { systemMutation, systemQuery } from '../lib/system';
import schema from '../schema';
import {
    type ClerkWebhookEvent,
    deleteMembership,
    deleteOrg,
    deleteUser,
    planWebhookActions,
    upsertMembership,
    upsertOrg,
    upsertUserFromClerk,
} from './webhooks';

/** Fixed epoch-ms stamp shared by every seeded row so the seeds are deterministic across cases. */
const SEED_NOW = 1_700_000_000_000;

/**
 * The reserved domain `webhooks.ts` provisions a synthetic placeholder email under when a membership
 * arrives with no `identifier`. Assembled from parts so the assertions reference the contract without
 * hard-coding the full address literal.
 *
 * @param clerkUserId - The subject the placeholder is keyed on.
 * @returns The synthetic email a placeholder row carries.
 */
function syntheticEmail(clerkUserId: string): string {
    return `${clerkUserId}@clerk.${'invalid'}`;
}

/**
 * Seeds a shop owned by a Clerk org and returns its id, written through the system tier's raw `db`
 * because `shops` is a platform-global table the system tier is sanctioned to write unscoped. Each
 * shop carries the minimal required `shopValidator` fields plus the `clerkOrgId` owner so the
 * projection's `shops.by_clerk_org` lookup resolves it.
 *
 * @param ctx - A system-tier mutation context exposing the raw writer `db`.
 * @param clerkOrgId - The owning Clerk org id stamped onto the shop.
 * @param key - A unique suffix disambiguating this shop's `legacyId`/`domain` from siblings.
 * @returns The inserted `shops` row id.
 */
const seedOrgShop = systemMutation({
    args: { clerkOrgId: v.string(), key: v.string() },
    handler: async (ctx, { clerkOrgId, key }) => {
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
 * Inserts a platform `users` row through the raw system-tier writer and returns its id. Shared seed
 * point so the row shape (managed timestamps, the now-removed-from-the-resolver-but-still-on-the-row
 * `emailVerified`/`identities`) is declared once.
 *
 * @param ctx - A system-tier mutation context exposing the raw writer `db`.
 * @param email - The user's email (the `by_email` upsert key).
 * @param name - The user's display name.
 * @param clerkUserId - Optional Clerk subject stamped onto the row.
 * @returns The inserted `users` row id.
 */
const seedUser = systemMutation({
    args: { email: v.string(), name: v.string(), clerkUserId: v.optional(v.string()) },
    handler: async (ctx, { email, name, clerkUserId }) => {
        return ctx.db.insert('users', {
            email,
            name,
            emailVerified: null,
            identities: [],
            clerkUserId,
            createdAt: SEED_NOW,
            updatedAt: SEED_NOW,
        });
    },
});

/**
 * Reads a `users` row by id through the raw system-tier reader so cases can assert the post-upsert
 * shape (`clerkUserId`/`name`/`avatar`) without standing up a public query surface.
 */
const readUser = systemQuery({
    args: { userId: v.id('users') },
    handler: async (ctx, { userId }) => ctx.db.get(userId),
});

/**
 * Reads a `users` row by email through the `by_email` index so cases can assert that a brand-new
 * provisioning upsert created exactly one row.
 */
const readUserByEmail = systemQuery({
    args: { email: v.string() },
    handler: async (ctx, { email }) =>
        ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', email))
            .collect(),
});

/**
 * Reads a user's projected `shopCollaborators` shop ids (sorted) so cases assert the fan-out set
 * regardless of insertion order.
 */
const readCollaboratorShops = systemQuery({
    args: { userId: v.id('users') },
    handler: async (ctx, { userId }) => {
        const rows = await ctx.db
            .query('shopCollaborators')
            .withIndex('by_user', (q) => q.eq('user', userId))
            .collect();
        return rows.map((row) => row.shop).sort();
    },
});

/** Reads the `orgs` rows matching a `clerkOrgId` so cases assert the org upsert/delete. */
const readOrgs = systemQuery({
    args: { clerkOrgId: v.string() },
    handler: async (ctx, { clerkOrgId }) =>
        ctx.db
            .query('orgs')
            .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
            .collect(),
});

/** Reads the `orgMemberships` rows for a `clerkOrgId` so cases assert the membership upsert/delete. */
const readMemberships = systemQuery({
    args: { clerkOrgId: v.string() },
    handler: async (ctx, { clerkOrgId }) =>
        ctx.db
            .query('orgMemberships')
            .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
            .collect(),
});

/**
 * Hand-built `convex-test` module map. Biome forbids exporting fixtures from a test file and the
 * default glob excludes the self-importing module, so the production internal mutations under test
 * (re-exported here) plus the local seed/read fixtures are mapped to this module's path and invoked
 * by `FunctionReference` — the supported path that runs the real constructors end to end.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/clerk/webhooks.test.ts': () =>
        Promise.resolve({
            upsertUserFromClerk,
            deleteUser,
            upsertOrg,
            deleteOrg,
            upsertMembership,
            deleteMembership,
            seedOrgShop,
            seedUser,
            readUser,
            readUserByEmail,
            readCollaboratorShops,
            readOrgs,
            readMemberships,
        }),
};

const upsertUserRef = makeFunctionReference<'mutation'>('clerk/webhooks.test:upsertUserFromClerk');
const deleteUserRef = makeFunctionReference<'mutation'>('clerk/webhooks.test:deleteUser');
const upsertOrgRef = makeFunctionReference<'mutation'>('clerk/webhooks.test:upsertOrg');
const deleteOrgRef = makeFunctionReference<'mutation'>('clerk/webhooks.test:deleteOrg');
const upsertMembershipRef = makeFunctionReference<'mutation'>('clerk/webhooks.test:upsertMembership');
const deleteMembershipRef = makeFunctionReference<'mutation'>('clerk/webhooks.test:deleteMembership');
const seedOrgShopRef = makeFunctionReference<'mutation'>('clerk/webhooks.test:seedOrgShop');
const seedUserRef = makeFunctionReference<'mutation'>('clerk/webhooks.test:seedUser');
const readUserRef = makeFunctionReference<'query'>('clerk/webhooks.test:readUser');
const readUserByEmailRef = makeFunctionReference<'query'>('clerk/webhooks.test:readUserByEmail');
const readCollaboratorShopsRef = makeFunctionReference<'query'>('clerk/webhooks.test:readCollaboratorShops');
const readOrgsRef = makeFunctionReference<'query'>('clerk/webhooks.test:readOrgs');
const readMembershipsRef = makeFunctionReference<'query'>('clerk/webhooks.test:readMemberships');

/**
 * Builds a `user.created`/`user.updated` event payload with the minimal claims the user upsert reads.
 *
 * @param overrides - Per-case overrides for `id`/`email`/`firstName`/`lastName`/`imageUrl`/`type`.
 * @returns A typed Clerk webhook event.
 */
function userEvent(overrides: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string;
    type?: 'user.created' | 'user.updated';
}): ClerkWebhookEvent {
    return {
        type: overrides.type ?? 'user.created',
        data: {
            id: overrides.id,
            first_name: overrides.firstName ?? 'Given',
            last_name: overrides.lastName ?? 'Family',
            image_url: overrides.imageUrl,
            primary_email_address_id: 'idn_1',
            email_addresses: [{ id: 'idn_1', email_address: overrides.email }],
        },
    };
}

/**
 * Builds an `organizationMembership.created`/`.updated`/`.deleted` event payload. The embedded
 * `public_user_data` carries the member's real email (`identifier`) plus name/avatar by default,
 * mirroring Clerk's real shape; pass `identifier: null` to model a payload that genuinely lacks an
 * email (the synthetic-placeholder path).
 *
 * @param overrides - The org id, the member's Clerk user id, role, type, identifier, and name/avatar.
 * @returns A typed Clerk webhook event.
 */
function membershipEvent(overrides: {
    orgId: string;
    clerkUserId: string;
    role?: string;
    identifier?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string;
    type?: 'organizationMembership.created' | 'organizationMembership.updated' | 'organizationMembership.deleted';
}): ClerkWebhookEvent {
    const identifier =
        overrides.identifier === null ? undefined : (overrides.identifier ?? `${overrides.clerkUserId}@b.com`);
    return {
        type: overrides.type ?? 'organizationMembership.created',
        data: {
            organization: { id: overrides.orgId, name: 'Acme', slug: 'acme' },
            public_user_data: {
                user_id: overrides.clerkUserId,
                identifier,
                first_name: overrides.firstName ?? 'Given',
                last_name: overrides.lastName ?? 'Family',
                image_url: overrides.imageUrl,
            },
            role: overrides.role ?? 'org:admin',
        },
    };
}

describe('planWebhookActions', () => {
    it('dispatches user.created to upsertUserFromClerk', () => {
        const actions = planWebhookActions(userEvent({ id: 'user_1', email: 'a@b.com' }));
        expect(actions).toEqual([
            {
                kind: 'upsertUserFromClerk',
                clerkUserId: 'user_1',
                email: 'a@b.com',
                name: 'Given Family',
                avatar: undefined,
            },
        ]);
    });

    it('dispatches user.deleted to deleteUser', () => {
        const actions = planWebhookActions({ type: 'user.deleted', data: { id: 'user_9', deleted: true } });
        expect(actions).toEqual([{ kind: 'deleteUser', clerkUserId: 'user_9' }]);
    });

    it('dispatches organization.created to upsertOrg', () => {
        const actions = planWebhookActions({
            type: 'organization.created',
            data: { id: 'org_1', name: 'Acme', slug: 'acme', image_url: 'https://img/acme.png' },
        });
        expect(actions).toEqual([
            { kind: 'upsertOrg', clerkOrgId: 'org_1', name: 'Acme', slug: 'acme', imageUrl: 'https://img/acme.png' },
        ]);
    });

    it('dispatches organization.deleted to deleteOrg', () => {
        const actions = planWebhookActions({ type: 'organization.deleted', data: { id: 'org_1', deleted: true } });
        expect(actions).toEqual([{ kind: 'deleteOrg', clerkOrgId: 'org_1' }]);
    });

    it('dispatches organizationMembership.created to upsertMembership with the member snapshot', () => {
        const actions = planWebhookActions(
            membershipEvent({ orgId: 'org_1', clerkUserId: 'user_1', imageUrl: 'https://img/u1.png' }),
        );
        expect(actions).toEqual([
            {
                kind: 'upsertMembership',
                clerkOrgId: 'org_1',
                clerkUserId: 'user_1',
                role: 'org:admin',
                email: 'user_1@b.com',
                name: 'Given Family',
                avatar: 'https://img/u1.png',
            },
        ]);
    });

    it('dispatches a membership with no identifier carrying an undefined email/name', () => {
        const actions = planWebhookActions(
            membershipEvent({
                orgId: 'org_1',
                clerkUserId: 'user_1',
                identifier: null,
                imageUrl: 'https://img/u1.png',
            }),
        );
        expect(actions).toEqual([
            {
                kind: 'upsertMembership',
                clerkOrgId: 'org_1',
                clerkUserId: 'user_1',
                role: 'org:admin',
                email: undefined,
                name: undefined,
                avatar: 'https://img/u1.png',
            },
        ]);
    });

    it('dispatches organizationMembership.deleted to deleteMembership', () => {
        const actions = planWebhookActions(
            membershipEvent({ orgId: 'org_1', clerkUserId: 'user_1', type: 'organizationMembership.deleted' }),
        );
        expect(actions).toEqual([{ kind: 'deleteMembership', clerkOrgId: 'org_1', clerkUserId: 'user_1' }]);
    });

    it('returns no actions for an unhandled event type', () => {
        const actions = planWebhookActions({ type: 'session.created', data: { id: 'sess_1' } } as ClerkWebhookEvent);
        expect(actions).toEqual([]);
    });
});

describe('upsertUserFromClerk', () => {
    it('links an existing email-keyed row by stamping clerkUserId and syncing name/avatar', async () => {
        const t = convexTest(schema, modules);
        const userId = await t.mutation(seedUserRef, { email: 'op@b.com', name: 'Old Name' });

        await t.mutation(upsertUserRef, {
            clerkUserId: 'user_1',
            email: 'op@b.com',
            name: 'New Name',
            avatar: 'https://img/op.png',
        });

        const user = await t.query(readUserRef, { userId });
        expect(user).toMatchObject({ clerkUserId: 'user_1', name: 'New Name', avatar: 'https://img/op.png' });
        // No duplicate row was inserted — the upsert linked the existing email row.
        const rows = await t.query(readUserByEmailRef, { email: 'op@b.com' });
        expect(rows).toHaveLength(1);
    });

    it('provisions a brand-new user when no email row exists', async () => {
        const t = convexTest(schema, modules);

        await t.mutation(upsertUserRef, { clerkUserId: 'user_new', email: 'new@b.com', name: 'Fresh' });

        const rows = await t.query(readUserByEmailRef, { email: 'new@b.com' });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ clerkUserId: 'user_new', name: 'Fresh' });
    });

    it('is idempotent — re-running the same event mutates in place, not duplicates', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(upsertUserRef, { clerkUserId: 'user_new', email: 'new@b.com', name: 'Fresh' });
        await t.mutation(upsertUserRef, { clerkUserId: 'user_new', email: 'new@b.com', name: 'Fresh' });

        const rows = await t.query(readUserByEmailRef, { email: 'new@b.com' });
        expect(rows).toHaveLength(1);
    });
});

describe('deleteUser', () => {
    it('clears clerkUserId without removing the row or its shop data', async () => {
        const t = convexTest(schema, modules);
        const userId = await t.mutation(seedUserRef, { email: 'op@b.com', name: 'Op', clerkUserId: 'user_1' });

        await t.mutation(deleteUserRef, { clerkUserId: 'user_1' });

        const user = await t.query(readUserRef, { userId });
        expect(user).not.toBeNull();
        expect(user?.clerkUserId).toBeUndefined();
    });

    it('is a no-op when no row carries the clerkUserId', async () => {
        const t = convexTest(schema, modules);
        await expect(t.mutation(deleteUserRef, { clerkUserId: 'user_absent' })).resolves.not.toThrow();
    });
});

describe('upsertOrg / deleteOrg', () => {
    it('upserts an org by clerkOrgId and updates it in place', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(upsertOrgRef, { clerkOrgId: 'org_1', name: 'Acme', slug: 'acme' });
        await t.mutation(upsertOrgRef, { clerkOrgId: 'org_1', name: 'Acme Inc', slug: 'acme-inc' });

        const orgs = await t.query(readOrgsRef, { clerkOrgId: 'org_1' });
        expect(orgs).toHaveLength(1);
        expect(orgs[0]).toMatchObject({ name: 'Acme Inc', slug: 'acme-inc' });
    });

    it('deletes the org, its memberships, and re-projects each affected user', async () => {
        const t = convexTest(schema, modules);
        const userId = await t.mutation(seedUserRef, { email: 'op@b.com', name: 'Op', clerkUserId: 'user_1' });
        const shopId = await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_1', key: 'a' });
        await t.mutation(upsertOrgRef, { clerkOrgId: 'org_1', name: 'Acme', slug: 'acme' });
        await t.mutation(upsertMembershipRef, { clerkOrgId: 'org_1', clerkUserId: 'user_1', role: 'org:admin' });

        // The membership fan-out granted the shop before deletion.
        expect(await t.query(readCollaboratorShopsRef, { userId })).toEqual([shopId]);

        await t.mutation(deleteOrgRef, { clerkOrgId: 'org_1' });

        expect(await t.query(readOrgsRef, { clerkOrgId: 'org_1' })).toHaveLength(0);
        expect(await t.query(readMembershipsRef, { clerkOrgId: 'org_1' })).toHaveLength(0);
        // The user's projection dropped the deleted org's shop.
        expect(await t.query(readCollaboratorShopsRef, { userId })).toEqual([]);
    });
});

describe('membership projection into shopCollaborators', () => {
    it('fans out one collaborator row per shop the org owns', async () => {
        const t = convexTest(schema, modules);
        const userId = await t.mutation(seedUserRef, { email: 'op@b.com', name: 'Op', clerkUserId: 'user_1' });
        const shopA = await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_1', key: 'a' });
        const shopB = await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_1', key: 'b' });

        await t.mutation(upsertMembershipRef, { clerkOrgId: 'org_1', clerkUserId: 'user_1', role: 'org:admin' });

        expect(await t.query(readCollaboratorShopsRef, { userId })).toEqual([shopA, shopB].sort());
    });

    it('unions shops across multiple orgs the user belongs to', async () => {
        const t = convexTest(schema, modules);
        const userId = await t.mutation(seedUserRef, { email: 'op@b.com', name: 'Op', clerkUserId: 'user_1' });
        const shopA = await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_1', key: 'a' });
        const shopB = await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_2', key: 'b' });

        await t.mutation(upsertMembershipRef, { clerkOrgId: 'org_1', clerkUserId: 'user_1', role: 'org:admin' });
        await t.mutation(upsertMembershipRef, { clerkOrgId: 'org_2', clerkUserId: 'user_1', role: 'org:member' });

        expect(await t.query(readCollaboratorShopsRef, { userId })).toEqual([shopA, shopB].sort());
    });

    it("membership.deleted removes that org's shops while keeping the user's other orgs", async () => {
        const t = convexTest(schema, modules);
        const userId = await t.mutation(seedUserRef, { email: 'op@b.com', name: 'Op', clerkUserId: 'user_1' });
        await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_1', key: 'a' });
        const shopB = await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_2', key: 'b' });
        await t.mutation(upsertMembershipRef, { clerkOrgId: 'org_1', clerkUserId: 'user_1', role: 'org:admin' });
        await t.mutation(upsertMembershipRef, { clerkOrgId: 'org_2', clerkUserId: 'user_1', role: 'org:member' });

        await t.mutation(deleteMembershipRef, { clerkOrgId: 'org_1', clerkUserId: 'user_1' });

        // Only org_2's shop survives.
        expect(await t.query(readCollaboratorShopsRef, { userId })).toEqual([shopB]);
        expect(await t.query(readMembershipsRef, { clerkOrgId: 'org_1' })).toHaveLength(0);
    });

    it('re-running membership.created is idempotent (no duplicate collaborator rows)', async () => {
        const t = convexTest(schema, modules);
        const userId = await t.mutation(seedUserRef, { email: 'op@b.com', name: 'Op', clerkUserId: 'user_1' });
        const shopA = await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_1', key: 'a' });

        await t.mutation(upsertMembershipRef, { clerkOrgId: 'org_1', clerkUserId: 'user_1', role: 'org:admin' });
        await t.mutation(upsertMembershipRef, { clerkOrgId: 'org_1', clerkUserId: 'user_1', role: 'org:admin' });

        expect(await t.query(readCollaboratorShopsRef, { userId })).toEqual([shopA]);
        // The membership row itself was not duplicated either.
        expect(await t.query(readMembershipsRef, { clerkOrgId: 'org_1' })).toHaveLength(1);
    });

    it('provisions a placeholder row when a membership lands before the user webhook AND carries no email', async () => {
        const t = convexTest(schema, modules);
        const shopA = await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_1', key: 'a' });

        // No seedUser and no email on the payload — the genuinely-no-identifier placeholder path.
        await t.mutation(upsertMembershipRef, {
            clerkOrgId: 'org_1',
            clerkUserId: 'user_lazy',
            role: 'org:admin',
        });

        const memberships = await t.query(readMembershipsRef, { clerkOrgId: 'org_1' });
        expect(memberships).toHaveLength(1);
        const userId = memberships[0]?.user;
        assert(userId, 'expected a provisioned user id');
        // The placeholder carries the synthetic email and is projected onto the org's shop.
        const user = await t.query(readUserRef, { userId });
        expect(user?.email).toBe(syntheticEmail('user_lazy'));
        expect(user?.clerkUserId).toBe('user_lazy');
        expect(await t.query(readCollaboratorShopsRef, { userId })).toEqual([shopA]);
    });

    it('links an EXISTING email row when a membership with that email lands before the user webhook (no duplicate)', async () => {
        const t = convexTest(schema, modules);
        // A legacy operator already has an email-keyed row with NO clerkUserId (pre-migration).
        const legacyUserId = await t.mutation(seedUserRef, { email: 'op@b.com', name: 'Legacy Op' });
        const shopA = await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_1', key: 'a' });

        // The membership webhook arrives BEFORE user.created, carrying the operator's real email.
        await t.mutation(upsertMembershipRef, {
            clerkOrgId: 'org_1',
            clerkUserId: 'user_1',
            role: 'org:admin',
            email: 'op@b.com',
            name: 'Op From Clerk',
            avatar: 'https://img/op.png',
        });

        // The EXISTING row was linked — clerkUserId stamped, name/avatar synced — not a duplicate created.
        const linked = await t.query(readUserRef, { userId: legacyUserId });
        expect(linked).toMatchObject({ clerkUserId: 'user_1', name: 'Op From Clerk', avatar: 'https://img/op.png' });
        // Exactly ONE row for that email.
        expect(await t.query(readUserByEmailRef, { email: 'op@b.com' })).toHaveLength(1);
        // The grant landed on the operator's real row.
        expect(await t.query(readCollaboratorShopsRef, { userId: legacyUserId })).toEqual([shopA]);

        // A later user.created subject-hits the SAME row (idempotent, still one email row, grant intact).
        await t.mutation(upsertUserRef, { clerkUserId: 'user_1', email: 'op@b.com', name: 'Op' });
        expect(await t.query(readUserByEmailRef, { email: 'op@b.com' })).toHaveLength(1);
        expect(await t.query(readCollaboratorShopsRef, { userId: legacyUserId })).toEqual([shopA]);
    });

    it('upsertUserFromClerk merges a placeholder row onto the real-email row, preserving the grant', async () => {
        const t = convexTest(schema, modules);
        const shopA = await t.mutation(seedOrgShopRef, { clerkOrgId: 'org_1', key: 'a' });
        // 1) A no-email membership provisions a placeholder row keyed only on the subject.
        await t.mutation(upsertMembershipRef, { clerkOrgId: 'org_1', clerkUserId: 'user_1', role: 'org:admin' });
        // 2) Independently, a real-email row already exists for that same operator (legacy, no clerkUserId).
        const emailUserId = await t.mutation(seedUserRef, { email: 'op@b.com', name: 'Legacy Op' });

        // 3) user.created arrives with the subject AND the real email → merge path collapses the two.
        await t.mutation(upsertUserRef, {
            clerkUserId: 'user_1',
            email: 'op@b.com',
            name: 'Op',
            avatar: 'https://img/op.png',
        });

        // Exactly one row for the email, and the placeholder is gone.
        expect(await t.query(readUserByEmailRef, { email: 'op@b.com' })).toHaveLength(1);
        expect(await t.query(readUserByEmailRef, { email: syntheticEmail('user_1') })).toHaveLength(0);
        // The surviving row is the email row, now carrying the subject.
        const survivor = await t.query(readUserRef, { userId: emailUserId });
        expect(survivor).toMatchObject({ clerkUserId: 'user_1', name: 'Op', avatar: 'https://img/op.png' });
        // The grant moved with the membership — the email row owns the org's shop, and only it does.
        expect(await t.query(readCollaboratorShopsRef, { userId: emailUserId })).toEqual([shopA]);
        // The org's single membership now points at the surviving row.
        const memberships2 = await t.query(readMembershipsRef, { clerkOrgId: 'org_1' });
        expect(memberships2).toHaveLength(1);
        expect(memberships2[0]?.user).toBe(emailUserId);
    });
});
