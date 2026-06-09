import { v } from 'convex/values';

import { serverQuery } from '../_constructors';
import type { Doc } from '../_generated/dataModel';
import { shopByPublicId } from './shops';

/**
 * A review projected for the `packages/db` seam: the branded `shopId` reference is replaced by the
 * owning shop's PUBLIC id (`legacyId`) under the frozen `ReviewBase['shop']` key, so a Convex `_id`
 * never rides a shop reference across the wire.
 */
export type ReviewReadView = {
    _id: Doc<'reviews'>['_id'];
    createdAt: number;
    updatedAt: number;
    shop: string;
};

/**
 * Projects a review row onto {@link ReviewReadView}, swapping the branded shop reference for the
 * shop's public id.
 *
 * @param review - The stored review row.
 * @param shopPublicId - The owning shop's `legacyId`.
 * @returns The projected review.
 */
function toReviewView(review: Doc<'reviews'>, shopPublicId: string): ReviewReadView {
    return {
        _id: review._id,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        shop: shopPublicId,
    };
}

/**
 * Per-shop review listing backing `Review.findByShop`. The caller passes the PUBLIC shop id (the
 * seam's `shop.id`); it is resolved to the shops row and the reviews are read through `by_shop`,
 * optionally capped — the Convex parity of the Mongo `{ shop } + limit(count)` query.
 *
 * @returns The shop's reviews (empty when the shop is unknown), each carrying the public shop id.
 */
export const byShop = serverQuery({
    args: { shopId: v.string(), count: v.optional(v.number()) },
    handler: async (ctx, { shopId, count }): Promise<ReviewReadView[]> => {
        const shop = await shopByPublicId(ctx, shopId);
        if (!shop) {
            return [];
        }
        const query = ctx.db.query('reviews').withIndex('by_shop', (q) => q.eq('shopId', shop._id));
        const rows = typeof count === 'number' && count > 0 ? await query.take(count) : await query.collect();
        return rows.map((row) => toReviewView(row, shop.legacyId));
    },
});

/**
 * Cross-tenant review listing backing `Review.findAll`. Each review's branded `shopId` is resolved
 * (and cached per call) to the owning shop's public id; reviews whose shop row is gone are dropped
 * rather than surfacing a dangling reference.
 *
 * @returns Every review, each carrying its owning shop's public id.
 */
export const findAll = serverQuery({
    args: {},
    handler: async (ctx): Promise<ReviewReadView[]> => {
        const rows = await ctx.db.query('reviews').collect();
        const shopIds = new Map<Doc<'reviews'>['shopId'], string | null>();
        const views: ReviewReadView[] = [];
        for (const row of rows) {
            if (!shopIds.has(row.shopId)) {
                const shop = await ctx.db.get(row.shopId);
                shopIds.set(row.shopId, shop ? shop.legacyId : null);
            }
            const publicId = shopIds.get(row.shopId);
            if (publicId) {
                views.push(toReviewView(row, publicId));
            }
        }
        return views;
    },
});
