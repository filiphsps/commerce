import 'server-only';

import { docToReview } from '../lib/doc-to-shape';
import type { ReviewBase } from '../models';
import { getRegisteredPayload } from '../payload-registry';

type FindOptions = {
    count?: number;
};

/**
 * Review service backed by `payload.local`. Method signatures preserved from
 * the prior Mongoose-backed service so storefront / admin callsites are
 * unchanged. Payload is obtained lazily per call from the commerce-db
 * registry (registered once at app boot from `instrumentation.ts`).
 */
export class ReviewService {
    public async findByShop(shopId: string, { count }: FindOptions = {}): Promise<ReviewBase[]> {
        const payload = await getRegisteredPayload();
        const { docs } = await payload.find({
            collection: 'reviews' as never,
            where: { shop: { equals: shopId } } as never,
            limit: count ?? 0,
            depth: 1,
            overrideAccess: true,
        });
        return (docs as unknown as Array<Record<string, unknown>>).map(docToReview);
    }

    public async findAll({ tenant }: { tenant?: string } = {}): Promise<ReviewBase[]> {
        const payload = await getRegisteredPayload();
        const { docs } = await payload.find({
            collection: 'reviews' as never,
            where: tenant ? ({ tenant: { equals: tenant } } as never) : undefined,
            limit: 0,
            depth: 1,
            overrideAccess: true,
        });
        return (docs as unknown as Array<Record<string, unknown>>).map(docToReview);
    }
}

export const Review = new ReviewService();
