import type { Id } from '../../../convex/convex/_generated/dataModel';
import type { MutationCtx } from '../../../convex/convex/_generated/server';
import { mediaFixtures, REVIEW_COUNT } from './fixtures/reviews-media';

/**
 * Seeds the advanced shop's reviews and media. Idempotent: `reviews` (which has no natural key) is
 * topped up to {@link REVIEW_COUNT} for the shop rather than appended, and `media` is keyed by its
 * `alt` text within the shop. The `media.shop` column is a `v.string()`, so the branded shop id is
 * stored as its string form; `reviews.shopId` is a real `v.id('shops')`.
 *
 * @param ctx - A Convex mutation context.
 * @param shopId - The advanced shop.
 */
export async function seedReviewsMediaMutation(ctx: MutationCtx, shopId: Id<'shops'>): Promise<void> {
    const now = Date.now();

    const existingReviews = await ctx.db
        .query('reviews')
        .withIndex('by_shop', (q) => q.eq('shopId', shopId))
        .collect();
    for (let i = existingReviews.length; i < REVIEW_COUNT; i += 1) {
        await ctx.db.insert('reviews', { shopId, createdAt: now, updatedAt: now });
    }

    const existingMedia = await ctx.db
        .query('media')
        .withIndex('by_shop', (q) => q.eq('shop', shopId))
        .collect();
    const seenAlt = new Set(existingMedia.map((m) => m.alt));
    for (const media of mediaFixtures) {
        if (seenAlt.has(media.alt)) continue;
        await ctx.db.insert('media', { shop: shopId, ...media, createdAt: now, updatedAt: now });
    }
}
