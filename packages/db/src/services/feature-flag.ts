import 'server-only';

import { docToFeatureFlag } from '../lib/doc-to-shape';
import type { FeatureFlagBase } from '../models';
import { getRegisteredPayload } from '../payload-registry';

/**
 * FeatureFlag service backed by `payload.local`. Method signatures preserved
 * from the prior Mongoose-backed service. Payload is obtained lazily per call
 * from the commerce-db registry (registered once at app boot from
 * `instrumentation.ts`).
 */
export class FeatureFlagService {
    public async findByKey(key: string): Promise<FeatureFlagBase | null> {
        const payload = await getRegisteredPayload();
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
        const payload = await getRegisteredPayload();
        const { docs } = await payload.find({
            collection: 'feature-flags' as never,
            limit: 0,
            overrideAccess: true,
        });
        return (docs as unknown as Array<Record<string, unknown>>).map(docToFeatureFlag);
    }
}

export const FeatureFlag = new FeatureFlagService();
