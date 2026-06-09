import { v } from 'convex/values';

import { serverMutation, serverQuery } from '../_constructors';
import type { Doc } from '../_generated/dataModel';

/**
 * Convex-id → identity read backing the seam's generic `Identity.find({ id })` / `Identity.findById`.
 *
 * @returns The identity row, or `null` when the id does not resolve.
 */
export const byId = serverQuery({
    args: { id: v.string() },
    handler: async (ctx, { id }): Promise<Doc<'identities'> | null> => {
        const identityId = ctx.db.normalizeId('identities', id);
        return identityId ? ctx.db.get(identityId) : null;
    },
});

/**
 * `(provider, identity)` → identity read through the `by_provider_identity` index.
 *
 * @returns The identity row, or `null` when the pair is unknown.
 */
export const byProviderIdentity = serverQuery({
    args: { provider: v.string(), identity: v.string() },
    handler: async (ctx, { provider, identity }): Promise<Doc<'identities'> | null> =>
        ctx.db
            .query('identities')
            .withIndex('by_provider_identity', (q) => q.eq('provider', provider).eq('identity', identity))
            .first(),
});

/**
 * Upserts the canonical OAuth identity keyed on `(provider, identity)` — the adapter's
 * `Identity.findOneAndUpdate(filter, update, { upsert })`. The Mongo unique index becomes a
 * mutation-layer constraint: the lookup and the write share one serializable Convex transaction, so
 * two concurrent links of the same account still yield exactly one row (`.unique()` would surface a
 * pre-existing violation loudly). Token fields are replaced wholesale — a refresh that drops `scope`
 * or `refreshToken` clears the stale value rather than keeping it. Exactly one write per invocation.
 *
 * @returns The upserted identity row; `null` when the pair is absent and `upsert` was not requested.
 */
export const upsertByProviderIdentity = serverMutation({
    args: {
        provider: v.string(),
        identity: v.string(),
        scope: v.optional(v.string()),
        expiresAt: v.optional(v.number()),
        refreshToken: v.optional(v.string()),
        accessToken: v.optional(v.string()),
        upsert: v.optional(v.boolean()),
    },
    handler: async (
        ctx,
        { provider, identity, scope, expiresAt, refreshToken, accessToken, upsert },
    ): Promise<Doc<'identities'> | null> => {
        const existing = await ctx.db
            .query('identities')
            .withIndex('by_provider_identity', (q) => q.eq('provider', provider).eq('identity', identity))
            .unique();
        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, { scope, expiresAt, refreshToken, accessToken, updatedAt: now });
            return ctx.db.get(existing._id);
        }
        if (!upsert) {
            return null;
        }
        const id = await ctx.db.insert('identities', {
            provider,
            identity,
            scope,
            expiresAt,
            refreshToken,
            accessToken,
            createdAt: now,
            updatedAt: now,
        });
        return ctx.db.get(id);
    },
});
