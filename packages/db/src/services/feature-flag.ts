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
    /**
     * Retrieves a single feature flag by its unique key.
     *
     * @param key - The flag's unique string key, as set in the admin interface.
     * @returns The flag document, or `null` when no flag with that key exists.
     * @example
     * ```ts
     * const darkMode = await FeatureFlag.findByKey('dark-mode');
     * if (darkMode) { /* evaluate flag *\/ }
     * ```
     */
    public async findByKey(key: string): Promise<FeatureFlagBase | null> {
        const doc = await FeatureFlagModel.findOne({ key }).lean<FeatureFlagBase>().exec();
        return doc ? docToFeatureFlag(doc as unknown as Record<string, unknown>) : null;
    }

    /**
     * Returns all feature flags, suitable for bulk evaluation or the admin flag index.
     *
     * @returns Array of all persisted flag documents; empty when none exist.
     * @example
     * ```ts
     * const flags = await FeatureFlag.findAll();
     * ```
     */
    public async findAll(): Promise<FeatureFlagBase[]> {
        const docs = await FeatureFlagModel.find({}).lean<FeatureFlagBase[]>().exec();
        return docs.map((d) => docToFeatureFlag(d as unknown as Record<string, unknown>));
    }
}

export const FeatureFlag = new FeatureFlagService();
