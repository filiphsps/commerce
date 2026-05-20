import 'server-only';

import { docToFeatureFlag } from '../lib/doc-to-shape';
import type { FeatureFlagBase } from '../models';
import { FeatureFlagModel } from '../models';

/**
 * FeatureFlag service backed by Mongoose. Method signatures preserved from
 * the prior Payload-backed service so storefront / admin callsites are
 * unchanged.
 */
export class FeatureFlagService {
    public async findByKey(key: string): Promise<FeatureFlagBase | null> {
        const doc = await FeatureFlagModel.findOne({ key }).lean<FeatureFlagBase>().exec();
        return doc ? docToFeatureFlag(doc as unknown as Record<string, unknown>) : null;
    }

    public async findAll(): Promise<FeatureFlagBase[]> {
        const docs = await FeatureFlagModel.find({}).lean<FeatureFlagBase[]>().exec();
        return docs.map((d) => docToFeatureFlag(d as unknown as Record<string, unknown>));
    }
}

export const FeatureFlag = new FeatureFlagService();
