import { ConvexError, v } from 'convex/values';

import { serverMutation, serverQuery } from '../_constructors';
import type { Doc } from '../_generated/dataModel';

/**
 * Stable {@link ConvexError} codes for the session seam writes.
 */
export const SessionWriteErrorCode = {
    /** `create` was handed a `userId` that resolves to no users row. */
    USER_NOT_FOUND: 'SESSION_USER_NOT_FOUND',
    /** A freshly-written row could not be read back inside the same transaction. */
    WRITE_READBACK_FAILED: 'SESSION_WRITE_READBACK_FAILED',
} as const;

/**
 * A session paired with its owning user — `SessionBase.user` is the POPULATED `UserBase` in the
 * frozen seam contract, so every session read resolves the user alongside the row.
 */
export type SessionReadView = {
    session: Doc<'sessions'>;
    user: Doc<'users'>;
};

/**
 * Inserts a session for an existing user — the Auth.js adapter's `createSession`. Exactly one write
 * per invocation; the user is resolved in the same transaction so the returned view is consistent.
 *
 * @returns The inserted session paired with its owning user.
 * @throws {ConvexError} `SESSION_USER_NOT_FOUND` when `userId` resolves to no user;
 *   `SESSION_WRITE_READBACK_FAILED` when the inserted row cannot be read back.
 */
export const create = serverMutation({
    args: { userId: v.string(), token: v.string(), expiresAt: v.number() },
    handler: async (ctx, { userId, token, expiresAt }): Promise<SessionReadView> => {
        const id = ctx.db.normalizeId('users', userId);
        const user = id ? await ctx.db.get(id) : null;
        if (!id || !user) {
            throw new ConvexError({
                code: SessionWriteErrorCode.USER_NOT_FOUND,
                message: 'Cannot create a session for an unknown user.',
            });
        }
        const now = Date.now();
        const sessionId = await ctx.db.insert('sessions', {
            user: id,
            token,
            expiresAt,
            createdAt: now,
            updatedAt: now,
        });
        const session = await ctx.db.get(sessionId);
        if (!session) {
            throw new ConvexError({
                code: SessionWriteErrorCode.WRITE_READBACK_FAILED,
                message: 'Inserted session row could not be read back.',
            });
        }
        return { session, user };
    },
});

/**
 * Bearer-token → session read through `by_token`, the session-validation hot path.
 *
 * @returns The session with its populated user, or `null` when the token is unknown or the owning
 *   user row is gone (an orphaned session reads as a miss rather than a dangling reference).
 */
export const byToken = serverQuery({
    args: { token: v.string() },
    handler: async (ctx, { token }): Promise<SessionReadView | null> => {
        const session = await ctx.db
            .query('sessions')
            .withIndex('by_token', (q) => q.eq('token', token))
            .first();
        if (!session) {
            return null;
        }
        const user = await ctx.db.get(session.user);
        return user ? { session, user } : null;
    },
});

/**
 * Convex-id → session read backing the seam's generic `Session.find({ id })` / `Session.findById`.
 *
 * @returns The session with its populated user, or `null` when the id does not resolve.
 */
export const byId = serverQuery({
    args: { id: v.string() },
    handler: async (ctx, { id }): Promise<SessionReadView | null> => {
        const sessionId = ctx.db.normalizeId('sessions', id);
        const session = sessionId ? await ctx.db.get(sessionId) : null;
        if (!session) {
            return null;
        }
        const user = await ctx.db.get(session.user);
        return user ? { session, user } : null;
    },
});

/**
 * Deletes a session by its bearer token — the adapter's `deleteSession` (sign-out). Exactly one
 * write per invocation; an unknown token is a no-op.
 *
 * @returns `true` when a session was deleted, `false` when the token matched nothing.
 */
export const deleteByToken = serverMutation({
    args: { token: v.string() },
    handler: async (ctx, { token }): Promise<boolean> => {
        const session = await ctx.db
            .query('sessions')
            .withIndex('by_token', (q) => q.eq('token', token))
            .first();
        if (!session) {
            return false;
        }
        await ctx.db.delete(session._id);
        return true;
    },
});
