import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { systemMutation, systemQuery } from '../_constructors';
import schema from '../schema';

/**
 * Unit tests for the `users.clerkUserId` field and its `by_clerk_user_id` index, added for
 * the Clerk auth migration. Drives the Convex validator and index contracts through the
 * `convex-test` in-memory backend so they run without a live deployment.
 */

/**
 * A fixed epoch-ms timestamp used wherever `createdAt`/`updatedAt` are required. The exact
 * value is irrelevant; it only has to satisfy the required numeric timestamp validators.
 */
const NOW = 1_700_000_000_000;

/**
 * Inserts a `users` row carrying the given `clerkUserId` and returns the inserted document id.
 * Written through the system tier's raw `ctx.db` — the sanctioned unscoped path for
 * platform-global tables.
 */
const insertUserWithClerkId = systemMutation({
    args: { clerkUserId: v.string() },
    handler: async (ctx, { clerkUserId }) =>
        ctx.db.insert('users', {
            email: `${clerkUserId}@example.com`,
            name: 'Alice',
            emailVerified: null,
            identities: [],
            clerkUserId,
            createdAt: NOW,
            updatedAt: NOW,
        }),
});

/**
 * Inserts a `users` row WITHOUT `clerkUserId` to prove the optional field validates cleanly
 * on rows that predate the migration. Returns the inserted document id.
 */
const insertUserWithoutClerkId = systemMutation({
    args: {},
    handler: async (ctx) =>
        ctx.db.insert('users', {
            email: 'legacy@example.com',
            name: 'Bob',
            emailVerified: null,
            identities: [],
            createdAt: NOW,
            updatedAt: NOW,
        }),
});

/**
 * Resolves a `users` row via the `by_clerk_user_id` index and returns its `_id` plus
 * `clerkUserId`, or `null` if no row matches. Exercises the index declared in `auth.ts`.
 */
const findByClerkUserId = systemQuery({
    args: { clerkUserId: v.string() },
    handler: async (ctx, { clerkUserId }) => {
        const row = await ctx.db
            .query('users')
            .withIndex('by_clerk_user_id', (q) => q.eq('clerkUserId', clerkUserId))
            .unique();
        if (row === null) return null;
        return { id: row._id, clerkUserId: row.clerkUserId };
    },
});

/**
 * Hand-built module map for `convex-test`. The `_generated/server.js` key is required so
 * convex-test's module-root detection can derive the shared `/convex/` prefix. The fixtures
 * are mapped to this module's path so they resolve by `FunctionReference` — the supported
 * invocation path that runs the real constructors end to end without tripping Convex's
 * "functions should not call other functions" guard.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/tables/auth.test.ts': () =>
        Promise.resolve({ insertUserWithClerkId, insertUserWithoutClerkId, findByClerkUserId }),
};

const insertUserWithClerkIdRef = makeFunctionReference<'mutation'>('tables/auth.test:insertUserWithClerkId');
const insertUserWithoutClerkIdRef = makeFunctionReference<'mutation'>('tables/auth.test:insertUserWithoutClerkId');
const findByClerkUserIdRef = makeFunctionReference<'query'>('tables/auth.test:findByClerkUserId');

describe('users table — clerkUserId field and by_clerk_user_id index', () => {
    it('inserts a users row with clerkUserId and resolves it via the by_clerk_user_id index', async () => {
        const t = convexTest(schema, modules);

        const insertedId = await t.mutation(insertUserWithClerkIdRef, { clerkUserId: 'user_123' });
        const found = await t.query(findByClerkUserIdRef, { clerkUserId: 'user_123' });

        expect(found).not.toBeNull();
        expect(found?.id).toBe(insertedId);
        expect(found?.clerkUserId).toBe('user_123');
    });

    it('returns null from by_clerk_user_id when clerkUserId is absent', async () => {
        const t = convexTest(schema, modules);

        // Insert a row without clerkUserId to verify the optional field validates cleanly.
        await t.mutation(insertUserWithoutClerkIdRef, {});

        const found = await t.query(findByClerkUserIdRef, { clerkUserId: 'user_456' });

        expect(found).toBeNull();
    });
});
