import 'server-only';

import type { Payload } from 'payload';
import { docToReview } from '../lib/doc-to-shape';
import type { ReviewBase } from '../models';

type FindOptions = {
    count?: number;
};

/**
 * Review service backed by `payload.local`. Method signatures preserved from
 * the prior Mongoose-backed service so storefront / admin callsites are
 * unchanged. Payload instance is injected at app boot via `setPayload()`.
 */
export class ReviewService {
    private payload: Payload | null = null;

    public setPayload(payload: Payload): void {
        this.payload = payload;
    }

    /** @internal — test-only injection point. */
    public _setPayloadForTests(payload: Payload): void {
        this.payload = payload;
    }

    private getPayload(): Payload {
        if (!this.payload) {
            throw new Error('[ReviewService] Payload not initialized; call setPayload(payload) at app boot.');
        }
        return this.payload;
    }

    public async findByShop(shopId: string, { count }: FindOptions = {}): Promise<ReviewBase[]> {
        const payload = this.getPayload();
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
        const payload = this.getPayload();
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
