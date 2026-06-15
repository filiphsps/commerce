import { makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { convexTest } from 'convex-test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthErrorCode } from '../lib/auth';
import { systemMutation } from '../lib/system';
import schema from '../schema';
import * as self from './self';

const TRUSTED_ISSUER = 'https://storefront.test.nordcom.io';

/** Seeds a platform user directly through the system tier (unscoped write to a platform-global table). */
const seedUser = systemMutation({
    args: { email: v.string(), name: v.string() },
    handler: async (ctx, { email, name }) => {
        const now = 1_700_000_000_000;
        return ctx.db.insert('users', {
            email,
            name,
            emailVerified: null,
            identities: [
                {
                    id: 'identity-1',
                    provider: 'github',
                    identity: 'gh-1',
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            createdAt: now,
            updatedAt: now,
        });
    },
});

/** Reads a user's stored name + theme straight from the row (assertion probe). */
const readUser = systemMutation({
    args: { email: v.string() },
    handler: async (ctx, { email }) => {
        const row = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', email))
            .first();
        return row ? { name: row.name, theme: row.preferences?.theme ?? null } : null;
    },
});

const modules = {
    '/convex/_generated/server.js': () => Promise.resolve({}),
    '/convex/account/self.ts': () => Promise.resolve(self),
    '/convex/account/self.test.ts': () => Promise.resolve({ seedUser, readUser }),
};

const seedUserRef = makeFunctionReference<'mutation'>('account/self.test:seedUser');
const readUserRef = makeFunctionReference<'mutation', { email: string }, { name: string; theme: string | null } | null>(
    'account/self.test:readUser',
);
const getRef = makeFunctionReference<'query', Record<string, never>, self.AccountSelf>('account/self:get');
const updateRef = makeFunctionReference<'mutation', { name?: string; theme?: 'dark' | 'system' }, self.AccountSelf>(
    'account/self:update',
);

beforeEach(() => {
    vi.stubEnv('CONVEX_AUTH_ISSUER', TRUSTED_ISSUER);
});
afterEach(() => {
    vi.unstubAllEnvs();
});

describe('account/self:get', () => {
    it('returns the caller-scoped account view with a default theme', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'op@example.com', name: 'Op Erator' });

        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'op', email: 'op@example.com' });

        await expect(asOp.query(getRef, {})).resolves.toMatchObject({
            name: 'Op Erator',
            email: 'op@example.com',
            emailVerified: null,
            theme: 'system',
            identities: [{ provider: 'github', identity: 'gh-1' }],
        });
    });

    it('rejects unauthenticated, forged-issuer, email-less, and unknown-user identities', async () => {
        const t = convexTest(schema, modules);

        await expect(t.query(getRef, {})).rejects.toMatchObject({ data: { code: AuthErrorCode.UNAUTHENTICATED } });

        const asForged = t.withIdentity({ issuer: 'https://evil.example.com', subject: 'x', email: 'op@example.com' });
        await expect(asForged.query(getRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });

        const asEmailless = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'x' });
        await expect(asEmailless.query(getRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.IDENTITY_WITHOUT_EMAIL },
        });

        const asStranger = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'x', email: 'stranger@example.com' });
        await expect(asStranger.query(getRef, {})).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNKNOWN_USER },
        });
    });
});

describe('account/self:update', () => {
    it('updates the caller’s name and theme and returns the fresh view', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'op@example.com', name: 'Old Name' });

        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'op', email: 'op@example.com' });

        await expect(asOp.mutation(updateRef, { name: '  New Name  ', theme: 'dark' })).resolves.toMatchObject({
            name: 'New Name',
            theme: 'dark',
        });
        await expect(t.mutation(readUserRef, { email: 'op@example.com' })).resolves.toEqual({
            name: 'New Name',
            theme: 'dark',
        });
    });

    it('supports partial updates: theme-only leaves the name intact', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'op@example.com', name: 'Keep Me' });

        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'op', email: 'op@example.com' });
        await asOp.mutation(updateRef, { theme: 'system' });

        await expect(t.mutation(readUserRef, { email: 'op@example.com' })).resolves.toEqual({
            name: 'Keep Me',
            theme: 'system',
        });
    });

    it('rejects an empty or whitespace-only name', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'op@example.com', name: 'Old Name' });

        const asOp = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'op', email: 'op@example.com' });
        await expect(asOp.mutation(updateRef, { name: '   ' })).rejects.toMatchObject({
            data: { code: self.AccountErrorCode.INVALID_NAME },
        });
        // The rejected write left the row untouched.
        await expect(t.mutation(readUserRef, { email: 'op@example.com' })).resolves.toEqual({
            name: 'Old Name',
            theme: null,
        });
    });

    it('keeps writes caller-scoped: updating as A never touches B', async () => {
        const t = convexTest(schema, modules);
        await t.mutation(seedUserRef, { email: 'a@example.com', name: 'A' });
        await t.mutation(seedUserRef, { email: 'b@example.com', name: 'B' });

        const asA = t.withIdentity({ issuer: TRUSTED_ISSUER, subject: 'a', email: 'a@example.com' });
        await asA.mutation(updateRef, { name: 'A Renamed', theme: 'dark' });

        await expect(t.mutation(readUserRef, { email: 'b@example.com' })).resolves.toEqual({ name: 'B', theme: null });
    });

    it('rejects unauthenticated and forged identities', async () => {
        const t = convexTest(schema, modules);

        await expect(t.mutation(updateRef, { name: 'x' })).rejects.toMatchObject({
            data: { code: AuthErrorCode.UNAUTHENTICATED },
        });

        const asForged = t.withIdentity({ issuer: 'https://evil.example.com', subject: 'x', email: 'op@example.com' });
        await expect(asForged.mutation(updateRef, { name: 'x' })).rejects.toMatchObject({
            data: { code: AuthErrorCode.FORGED_IDENTITY },
        });
    });
});
