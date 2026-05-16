import 'server-only';

import type { Payload } from 'payload';
import { docToFeatureFlag } from '../lib/doc-to-shape';
import type { FeatureFlagBase } from '../models';

/**
 * FeatureFlag service backed by `payload.local`. Method signatures preserved
 * from the prior Mongoose-backed service. Payload instance is injected at app
 * boot via `setPayload()`.
 */
export class FeatureFlagService {
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
            throw new Error('[FeatureFlagService] Payload not initialized; call setPayload(payload) at app boot.');
        }
        return this.payload;
    }

    public async findByKey(key: string): Promise<FeatureFlagBase | null> {
        const payload = this.getPayload();
        const { docs } = await payload.find({
            collection: 'feature-flags' as never,
            where: { key: { equals: key } } as never,
            limit: 1,
            overrideAccess: true,
        });
        const doc = docs[0];
        return doc ? docToFeatureFlag(doc as unknown as Record<string, unknown>) : null;
    }

    public async findAll(): Promise<FeatureFlagBase[]> {
        const payload = this.getPayload();
        const { docs } = await payload.find({
            collection: 'feature-flags' as never,
            limit: 0,
            overrideAccess: true,
        });
        return (docs as unknown as Array<Record<string, unknown>>).map(docToFeatureFlag);
    }
}

export const FeatureFlag = new FeatureFlagService();
