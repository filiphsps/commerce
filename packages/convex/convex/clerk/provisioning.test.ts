import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Id } from '../_generated/dataModel';
import schema from '../schema';
import { AuthErrorCode } from '../lib/auth';
import { systemMutation, systemQuery } from '../lib/system';
import * as provisioning from './provisioning';

/**
 * The Clerk issuer set into `CLERK_FRONTEND_API_URL` for every case so the Clerk-issuer check in
 * `getClerkOperatorIdentity` is active under `convex-test`, whose `withIdentity` fakes identities
 * WITHOUT Convex's real signature/issuer validation — making it the only place forgery rejection can
 * be exercised. Matches the pattern in `lib/auth.test.ts`.
 */
const CLERK_ISSUER = 'https://clerk.test.nordcom.io';

/** Fixed epoch-ms stamp shared by every seeded row so the seeds are deterministic. */
const SEED_NOW = 1_700_000_000_000;

/**
 * Inserts a platform `users` row through the raw system-tier writer. The optional `clerkUserId`
 * stamps the Clerk subject; leave it unset to exercise the email-fallback link path.
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

/** Reads a `users` row by id through the raw system-tier reader for post-call assertions. */
const readUser = systemQuery({
    args: { userId: v.id('users') },
    handler: async (ctx, { userId }) => ctx.db.get(userId),
});

/** Reads all `users` rows for a given email so tests can assert no duplicate was created. */
const readUsersByEmail = systemQuery({
    args: { email: v.string() },
    handler: async (ctx, { email }) =>
        ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', email))
            .collect(),
});

/**
 * Hand-built module map for `convex-test`. The `ensureCurrentUser` mutation is exported from the
 * production module and invoked here via `FunctionReference` so the real constructor runs end to end
 * (identity validation + db writes). Seed/read helpers map to this test module's own path.
 */
const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/clerk/provisioning.ts': () => Promise.resolve(provisioning),
    '/convex/clerk/provisioning.test.ts': () => Promise.resolve({ seedUser, readUser, readUsersByEmail }),
};

const ensureCurrentUserRef = makeFunctionReference<'mutation', Record<string, never>, provisioning.EnsuredUser>(
    'clerk/provisioning:ensureCurrentUser',
);
const seedUserRef = makeFunctionReference<'mutation', { email: string; name: string; clerkUserId?: string }, Id<'users'>>(
    'clerk/provisioning.test:seedUser',
);
const readUserRef = makeFunctionReference<'query', { userId: Id<'users'> }>(
    'clerk/provisioning.test:readUser',
);
const readUsersByEmailRef = makeFunctionReference<'query', { email: string }>(
    'clerk/provisioning.test:readUsersByEmail',
);

beforeEach(() => {
    vi.stubEnv('CLERK_FRONTEND_API_URL', CLERK_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('ensureCurrentUser', () => {
    it('provisions a new users row when no row exists for the Clerk subject or email', async () => {
        const t = convexTest(schema, modules);
        const asOp = t.withIdentity({
            issuer: CLERK_ISSUER,
            subject: 'user_new',
            email: 'newop@example.com',
            name: 'New Operator',
        });

        const result = await asOp.mutation(ensureCurrentUserRef, {});

        expect(result.email).toBe('newop@example.com');
        expect(result.name).toBe('New Operator');

        const rows = await t.query(readUsersByEmailRef, { email: 'newop@example.com' });
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({ clerkUserId: 'user_new', email: 'newop@example.com' });
    });

    it('is idempotent — a second call returns the same row without duplicating', async () => {
        const t = convexTest(schema, modules);
        const asOp = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_idem', email: 'idem@example.com' });

        const first = await asOp.mutation(ensureCurrentUserRef, {});
        const second = await asOp.mutation(ensureCurrentUserRef, {});

        expect(first.id).toBe(second.id);
        const rows = await t.query(readUsersByEmailRef, { email: 'idem@example.com' });
        expect(rows).toHaveLength(1);
    });

    it('links an existing email-keyed row by stamping clerkUserId without creating a duplicate', async () => {
        const t = convexTest(schema, modules);
        // A legacy operator row exists with no clerkUserId (pre-migration).
        const legacyId = await t.mutation(seedUserRef, { email: 'legacy@example.com', name: 'Legacy Op' });

        const asOp = t.withIdentity({
            issuer: CLERK_ISSUER,
            subject: 'user_legacy',
            email: 'legacy@example.com',
        });
        const result = await asOp.mutation(ensureCurrentUserRef, {});

        // Returns the same row id.
        expect(result.id).toBe(legacyId);
        // Only one row for that email.
        const rows = await t.query(readUsersByEmailRef, { email: 'legacy@example.com' });
        expect(rows).toHaveLength(1);
        // The clerkUserId was stamped onto the existing row.
        const row = await t.query(readUserRef, { userId: legacyId });
        expect(row?.clerkUserId).toBe('user_legacy');
    });

    it('resolves to the existing row when the webhook has already provisioned it (no-op)', async () => {
        const t = convexTest(schema, modules);
        // Simulate the webhook having already run: row exists with clerkUserId stamped.
        const webhookId = await t.mutation(seedUserRef, {
            email: 'wh@example.com',
            name: 'Webhook Op',
            clerkUserId: 'user_wh',
        });

        const asOp = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_wh', email: 'wh@example.com' });
        const result = await asOp.mutation(ensureCurrentUserRef, {});

        expect(result.id).toBe(webhookId);
        const rows = await t.query(readUsersByEmailRef, { email: 'wh@example.com' });
        expect(rows).toHaveLength(1);
    });

    it('uses email local-part as the display name when the JWT carries no name claim', async () => {
        const t = convexTest(schema, modules);
        // Identity with no name/givenName/familyName — only email.
        const asOp = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_noname', email: 'noname@example.com' });

        const result = await asOp.mutation(ensureCurrentUserRef, {});

        // displayName falls back to the email local-part.
        expect(result.name).toBe('noname');
    });

    it('rejects an unauthenticated request', async () => {
        const t = convexTest(schema, modules);

        await expect(t.mutation(ensureCurrentUserRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNAUTHENTICATED },
        });
    });

    it('rejects a non-Clerk-issuer identity (FORGED_IDENTITY)', async () => {
        const t = convexTest(schema, modules);
        const asForged = t.withIdentity({
            issuer: 'https://evil.example.com',
            subject: 'user_evil',
            email: 'evil@example.com',
        });

        await expect(asForged.mutation(ensureCurrentUserRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });

        // No row was created.
        const rows = await t.query(readUsersByEmailRef, { email: 'evil@example.com' });
        expect(rows).toHaveLength(0);
    });

    it('rejects an identity with no email claim (IDENTITY_WITHOUT_EMAIL)', async () => {
        const t = convexTest(schema, modules);
        const asEmailless = t.withIdentity({ issuer: CLERK_ISSUER, subject: 'user_nomail' });

        await expect(asEmailless.mutation(ensureCurrentUserRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.IDENTITY_WITHOUT_EMAIL },
        });
    });
});
