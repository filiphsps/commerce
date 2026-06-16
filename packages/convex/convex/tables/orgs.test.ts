import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { systemMutation, systemQuery } from '../_constructors';
import schema from '../schema';

/**
 * Unit tests for the `orgs` and `orgMemberships` mirror tables added for the Clerk auth migration.
 * Drives the Convex validators and indexes through the `convex-test` in-memory backend so they run
 * without a live deployment.
 */

/**
 * A fixed epoch-ms timestamp used wherever `createdAt`/`updatedAt` are required. The exact value
 * is irrelevant; it only satisfies the required numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Inserts a `users` row and returns its id. Written through the system tier's raw `ctx.db` —
 * the sanctioned unscoped path for platform-global tables.
 */
const insertUser = systemMutation({
    args: {},
    handler: async (ctx) =>
        ctx.db.insert('users', {
            email: 'test@example.com',
            name: 'Test User',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        }),
});

/**
 * Inserts an `orgs` row with the given `clerkOrgId` and returns its id.
 */
const insertOrg = systemMutation({
    args: { clerkOrgId: v.string() },
    handler: async (ctx, { clerkOrgId }) =>
        ctx.db.insert('orgs', {
            clerkOrgId,
            name: 'Test Org',
            slug: 'test-org',
            createdAt: NOW,
            updatedAt: NOW,
        }),
});

/**
 * Inserts an `orgMemberships` row linking the given user and org. Returns the inserted id.
 */
const insertOrgMembership = systemMutation({
    args: { clerkOrgId: v.string(), userId: v.id('users'), clerkUserId: v.string() },
    handler: async (ctx, { clerkOrgId, userId, clerkUserId }) =>
        ctx.db.insert('orgMemberships', {
            clerkOrgId,
            user: userId,
            clerkUserId,
            role: 'member',
            createdAt: NOW,
        }),
});

/**
 * Queries `orgMemberships` via the `by_user` index for the given user id and returns the count
 * of matching rows.
 */
const countMembershipsByUser = systemQuery({
    args: { userId: v.id('users') },
    handler: async (ctx, { userId }) => {
        const rows = await ctx.db
            .query('orgMemberships')
            .withIndex('by_user', (q) => q.eq('user', userId))
            .collect();
        return rows.length;
    },
});

/**
 * Queries `orgMemberships` via the `by_clerk_org` index for the given `clerkOrgId` and returns
 * the count of matching rows.
 */
const countMembershipsByClerkOrg = systemQuery({
    args: { clerkOrgId: v.string() },
    handler: async (ctx, { clerkOrgId }) => {
        const rows = await ctx.db
            .query('orgMemberships')
            .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
            .collect();
        return rows.length;
    },
});

/**
 * Resolves an `orgs` row via the `by_clerk_org` index and returns its `clerkOrgId`, or `null`
 * if no row matches.
 */
const findOrgByClerkOrgId = systemQuery({
    args: { clerkOrgId: v.string() },
    handler: async (ctx, { clerkOrgId }) => {
        const row = await ctx.db
            .query('orgs')
            .withIndex('by_clerk_org', (q) => q.eq('clerkOrgId', clerkOrgId))
            .unique();
        if (row === null) return null;
        return row.clerkOrgId;
    },
});

/**
 * Hand-built module map for `convex-test`. The `_generated/server.js` key is required so
 * `convex-test`'s module-root detection can derive the shared `/convex/` prefix. The fixtures
 * are mapped to this module's path so they resolve by `FunctionReference` — the supported
 * invocation path that runs the real constructors end to end.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/tables/orgs.test.ts': () =>
        Promise.resolve({
            insertUser,
            insertOrg,
            insertOrgMembership,
            countMembershipsByUser,
            countMembershipsByClerkOrg,
            findOrgByClerkOrgId,
        }),
};

const insertUserRef = makeFunctionReference<'mutation'>('tables/orgs.test:insertUser');
const insertOrgRef = makeFunctionReference<'mutation'>('tables/orgs.test:insertOrg');
const insertOrgMembershipRef = makeFunctionReference<'mutation'>('tables/orgs.test:insertOrgMembership');
const countMembershipsByUserRef = makeFunctionReference<'query'>('tables/orgs.test:countMembershipsByUser');
const countMembershipsByClerkOrgRef = makeFunctionReference<'query'>('tables/orgs.test:countMembershipsByClerkOrg');
const findOrgByClerkOrgIdRef = makeFunctionReference<'query'>('tables/orgs.test:findOrgByClerkOrgId');

describe('orgs + orgMemberships mirror tables', () => {
    it('inserts a users row, an orgs row, and an orgMemberships row linking them', async () => {
        const t = convexTest(schema, modules);

        const userId = await t.mutation(insertUserRef, {});
        await t.mutation(insertOrgRef, { clerkOrgId: 'org_1' });
        await t.mutation(insertOrgMembershipRef, { clerkOrgId: 'org_1', userId, clerkUserId: 'user_1' });

        const byUser = await t.query(countMembershipsByUserRef, { userId });
        const byOrg = await t.query(countMembershipsByClerkOrgRef, { clerkOrgId: 'org_1' });

        expect(byUser).toBe(1);
        expect(byOrg).toBe(1);
    });

    it('resolves an orgs row via the by_clerk_org index', async () => {
        const t = convexTest(schema, modules);

        await t.mutation(insertOrgRef, { clerkOrgId: 'org_1' });

        const found = await t.query(findOrgByClerkOrgIdRef, { clerkOrgId: 'org_1' });

        expect(found).toBe('org_1');
    });

    it('returns null from by_clerk_org when no orgs row matches', async () => {
        const t = convexTest(schema, modules);

        const found = await t.query(findOrgByClerkOrgIdRef, { clerkOrgId: 'org_missing' });

        expect(found).toBeNull();
    });
});
