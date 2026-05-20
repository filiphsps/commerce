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
    public async findByShop(shopId: string, { count }: FindOptions = {}): Promise<ReviewBase[]> {
        let query = ReviewModel.find({ shop: shopId });
        if (count) query = query.limit(count);
        const docs = await query.lean<ReviewBase[]>().exec();
        return docs.map((d) => docToReview(d as unknown as Record<string, unknown>));
    }

    public async findAll({ tenant }: { tenant?: string } = {}): Promise<ReviewBase[]> {
        const filter = tenant ? { tenant } : {};
        const docs = await ReviewModel.find(filter).lean<ReviewBase[]>().exec();
        return docs.map((d) => docToReview(d as unknown as Record<string, unknown>));
    }
}

export const Review = new ReviewService();
