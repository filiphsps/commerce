import { v } from 'convex/values';

import { serverMutation } from '../_constructors';

/**
 * Flips one `shopDomains` routing row's connection state after an admin verify attempt. Patches by
 * the global `by_domain` index (domains are globally unique at write time) and always stamps
 * `lastCheckedAt`. A no-op `{ ok: false }` when the domain has no routing row, so a verify against a
 * since-deleted shop fails closed instead of throwing. Informational write only — routing never
 * reads these fields, so no cross-tenant authorization is implied by the patch.
 *
 * @returns `{ ok: true }` when a row was patched, `{ ok: false }` when no row matched the domain.
 */
export const setDomainVerification = serverMutation({
    args: {
        domain: v.string(),
        status: v.union(v.literal('pending'), v.literal('verified'), v.literal('failed')),
        via: v.optional(v.union(v.literal('vercel'), v.literal('service_domain'), v.literal('localhost'))),
        verifiedAt: v.optional(v.number()),
    },
    handler: async (ctx, { domain, status, via, verifiedAt }): Promise<{ ok: boolean }> => {
        const row = await ctx.db
            .query('shopDomains')
            .withIndex('by_domain', (q) => q.eq('domain', domain))
            .first();
        if (!row) {
            return { ok: false };
        }
        await ctx.db.patch(row._id, {
            status,
            ...(via !== undefined ? { via } : {}),
            ...(verifiedAt !== undefined ? { verifiedAt } : {}),
            lastCheckedAt: Date.now(),
        });
        return { ok: true };
    },
});
