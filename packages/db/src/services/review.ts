import 'server-only';

import { docToReview } from '../lib/doc-to-shape';
import type { ReviewBase } from '../models';
import { ReviewModel } from '../models';

type FindOptions = {
    count?: number;
};

/**
 * Review service backed by Mongoose. Method signatures preserved from the
 * prior Payload-backed service so callsites are unchanged.
 */
export class ReviewService {
    /**
     * Returns reviews submitted for a specific shop, optionally capped at a maximum count.
     *
     * @param shopId - The MongoDB `_id` string of the shop whose reviews to load.
     * @param options.count - Maximum number of reviews to return; omit for all.
     * @returns Reviews belonging to the shop, stripped of Mongo internals.
     * @example
     * ```ts
     * const latest = await Review.findByShop(shop.id, { count: 5 });
     * ```
     */
    public async findByShop(shopId: string, { count }: FindOptions = {}): Promise<ReviewBase[]> {
        let query = ReviewModel.find({ shop: shopId });
        if (count) query = query.limit(count);
        const docs = await query.lean<ReviewBase[]>().exec();
        return docs.map((d) => docToReview(d as unknown as Record<string, unknown>));
    }

    /**
     * Returns all reviews, with an optional tenant filter for cross-shop admin views.
     *
     * @param options.tenant - When set, restricts results to reviews that match that tenant value.
     * @returns All review documents passing the filter, stripped of Mongo internals.
     * @example
     * ```ts
     * const all = await Review.findAll();
     * ```
     */
    public async findAll({ tenant }: { tenant?: string } = {}): Promise<ReviewBase[]> {
        const filter = tenant ? { tenant } : {};
        const docs = await ReviewModel.find(filter).lean<ReviewBase[]>().exec();
        return docs.map((d) => docToReview(d as unknown as Record<string, unknown>));
    }
}

export const Review = new ReviewService();
