import 'server-only';

import { convexServerQuery } from '../db';
import { docToReview } from '../lib/doc-to-shape';
import type { ReviewBase } from '../models';

type ConvexDoc = Record<string, unknown>;

type FindOptions = {
    count?: number;
};

/**
 * Review service backed by the deployed `db/reviews` Convex functions. Method signatures preserved
 * from the prior Mongoose-backed service so callsites are unchanged.
 */
export class ReviewService {
    /**
     * Returns reviews submitted for a specific shop, optionally capped at a maximum count.
     *
     * @param shopId - The unified shop row id (the public `shop.id`). Resolved server-side to the
     *   Convex shop row, then matched through the reviews `by_shop` index.
     * @param options.count - Maximum number of reviews to return; omit for all.
     * @returns Reviews belonging to the shop, stripped of backend internals.
     * @example
     * ```ts
     * const latest = await Review.findByShop(shop.id, { count: 5 });
     * ```
     */
    public async findByShop(shopId: string, { count }: FindOptions = {}): Promise<ReviewBase[]> {
        const rows = await convexServerQuery<ConvexDoc[]>('db/reviews:byShop', {
            shopId,
            ...(count ? { count } : {}),
        });
        return rows.map((row) => docToReview(row));
    }

    /**
     * Returns all reviews, with an optional — dead — tenant filter.
     *
     * @param options.tenant - Dead filter retained only to preserve the method signature pinned by
     *   the service-seam contract. After the shop==tenant collapse a review relates to its shop by
     *   the `shop` id ref and carries no `tenant` field, so a provided filter matches nothing —
     *   exactly as the Mongo `{ tenant }` filter matched zero documents. Use
     *   {@link ReviewService.findByShop} for per-shop scoping.
     * @returns All review documents passing the filter, stripped of backend internals.
     * @example
     * ```ts
     * const all = await Review.findAll();
     * ```
     */
    public async findAll({ tenant }: { tenant?: string } = {}): Promise<ReviewBase[]> {
        // Preserve the frozen dead-filter semantics: no review carries a `tenant` field, so a
        // tenant-filtered call resolved to zero documents under Mongo and must keep doing so here.
        if (tenant) {
            return [];
        }
        const rows = await convexServerQuery<ConvexDoc[]>('db/reviews:findAll', {});
        return rows.map((row) => docToReview(row));
    }
}

export const Review = new ReviewService();
