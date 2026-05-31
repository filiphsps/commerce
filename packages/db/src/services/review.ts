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
     * @param shopId - The unified shop row id. Matched against the review's `shop` id ref
     *   (Phase-0 unification stores `shop` as the shop id, not an embedded shop doc).
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
     * Returns all reviews, with an optional — now dead — tenant filter.
     *
     * @param options.tenant - Dead filter retained only to preserve the method signature pinned by
     *   the service-seam contract. After the shop==tenant collapse a review relates to its shop by
     *   the `shop` id ref and carries no `tenant` field, so this filter matches nothing and never
     *   narrows the result. Use {@link ReviewService.findByShop} for per-shop scoping.
     * @returns All review documents passing the filter, stripped of Mongo internals.
     * @example
     * ```ts
     * const all = await Review.findAll();
     * ```
     */
    public async findAll({ tenant }: { tenant?: string } = {}): Promise<ReviewBase[]> {
        // Dead filter: no `tenant` field exists on reviews post shop==tenant collapse, so a
        // `{ tenant }` filter matches zero docs. Kept (rather than dropped) so the signature and
        // its passthrough query stay frozen until the service is re-homed on Convex.
        const filter = tenant ? { tenant } : {};
        const docs = await ReviewModel.find(filter).lean<ReviewBase[]>().exec();
        return docs.map((d) => docToReview(d as unknown as Record<string, unknown>));
    }
}

export const Review = new ReviewService();
