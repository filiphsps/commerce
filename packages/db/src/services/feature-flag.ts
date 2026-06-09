import 'server-only';

import { convexServerQuery } from '../db';
import { docToFeatureFlag } from '../lib/doc-to-shape';
import type { FeatureFlagBase } from '../models';

type ConvexDoc = Record<string, unknown>;

/**
 * FeatureFlag service backed by the deployed `db/feature_flags` Convex functions. Method
 * signatures preserved from the prior Mongoose-backed service so storefront / admin callsites are
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
        const row = await convexServerQuery<ConvexDoc | null>('db/feature_flags:byKey', { key });
        return row ? docToFeatureFlag(row) : null;
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
        const rows = await convexServerQuery<ConvexDoc[]>('db/feature_flags:findAll', {});
        return rows.map((row) => docToFeatureFlag(row));
    }
}

export const FeatureFlag = new FeatureFlagService();
