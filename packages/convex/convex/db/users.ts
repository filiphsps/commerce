import { ConvexError, v } from 'convex/values';

import { serverMutation, serverQuery } from '../_constructors';
import type { Doc } from '../_generated/dataModel';
import { embeddedIdentityValidator } from '../tables/auth';

/**
 * Stable {@link ConvexError} codes for the platform-user seam writes, so the `packages/db` caller
 * branches on a code rather than string-matching messages.
 */
export const UserWriteErrorCode = {
    /** `create` was asked to insert a user whose unique `email` already exists. */
    EMAIL_EXISTS: 'USER_EMAIL_EXISTS',
    /** A freshly-written row could not be read back inside the same transaction. */
    WRITE_READBACK_FAILED: 'USER_WRITE_READBACK_FAILED',
} as const;

/**
 * Convex-id → user read backing the seam's `User.find({ id })` / `User.findById`. A non-users id
 * string resolves to `null` (the Mongo `CastError`-to-miss behavior).
 *
 * @returns The user row, or `null` when the id does not resolve.
 */
export const byId = serverQuery({
    args: { id: v.string() },
    handler: async (ctx, { id }): Promise<Doc<'users'> | null> => {
        const userId = ctx.db.normalizeId('users', id);
        return userId ? ctx.db.get(userId) : null;
    },
});

/**
 * Email → user read backing the Auth.js adapter's `getUserByEmail`, through the `by_email` index.
 *
 * @returns The user row, or `null` when no user carries the email.
 */
export const byEmail = serverQuery({
    args: { email: v.string() },
    handler: async (ctx, { email }): Promise<Doc<'users'> | null> =>
        ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', email))
            .first(),
});

/**
 * `(provider, identity)` → user read backing the adapter's `getUserByAccount` — the Convex parity of
 * the Mongo `identities.$elemMatch` query. The user↔identity link lives as the embedded `identities`
 * array (faithful to the source schema), which Convex cannot index, so this scans the platform-user
 * table; platform users (shop collaborators) number in the tens, making the scan cheaper than
 * maintaining a derived join table for one login-time lookup.
 *
 * @returns The owning user row, or `null` when no user embeds the identity.
 */
export const byProviderIdentity = serverQuery({
    args: { provider: v.string(), identity: v.string() },
    handler: async (ctx, { provider, identity }): Promise<Doc<'users'> | null> => {
        const users = await ctx.db.query('users').collect();
        return (
            users.find((user) => user.identities.some((i) => i.provider === provider && i.identity === identity)) ??
            null
        );
    },
});

/**
 * Inserts a platform user, enforcing the source schema's unique-`email` constraint in the mutation
 * (Convex indexes are not unique; the serializable transaction makes the read-then-insert race-free).
 * Exactly one write per invocation.
 *
 * @returns The inserted user row.
 * @throws {ConvexError} `USER_EMAIL_EXISTS` when the email is already taken;
 *   `USER_WRITE_READBACK_FAILED` when the inserted row cannot be read back.
 */
export const create = serverMutation({
    args: {
        email: v.string(),
        name: v.string(),
        avatar: v.optional(v.string()),
        emailVerified: v.union(v.number(), v.null()),
        groups: v.optional(v.array(v.string())),
        identities: v.array(embeddedIdentityValidator),
    },
    handler: async (ctx, args): Promise<Doc<'users'>> => {
        const existing = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', args.email))
            .first();
        if (existing) {
            throw new ConvexError({
                code: UserWriteErrorCode.EMAIL_EXISTS,
                message: 'A user with this email already exists.',
            });
        }
        const now = Date.now();
        const id = await ctx.db.insert('users', { ...args, createdAt: now, updatedAt: now });
        const user = await ctx.db.get(id);
        if (!user) {
            throw new ConvexError({
                code: UserWriteErrorCode.WRITE_READBACK_FAILED,
                message: 'Inserted user row could not be read back.',
            });
        }
        return user;
    },
});

/**
 * Appends an OAuth identity to a user's embedded list — the Convex parity of the adapter's
 * `$push: { identities }` update. Deduplicates on the embedded `id` (the canonical identities-row
 * id), so re-linking an already-linked account is a no-op. Exactly one write per invocation.
 *
 * @returns The updated user row, or `null` when the user id does not resolve.
 */
export const pushIdentity = serverMutation({
    args: { userId: v.string(), identity: embeddedIdentityValidator },
    handler: async (ctx, { userId, identity }): Promise<Doc<'users'> | null> => {
        const id = ctx.db.normalizeId('users', userId);
        if (!id) {
            return null;
        }
        const user = await ctx.db.get(id);
        if (!user) {
            return null;
        }
        if (user.identities.some((existing) => existing.id === identity.id)) {
            return user;
        }
        await ctx.db.patch(id, { identities: [...user.identities, identity], updatedAt: Date.now() });
        return ctx.db.get(id);
    },
});
