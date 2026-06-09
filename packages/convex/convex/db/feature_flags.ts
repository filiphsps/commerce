import { v } from 'convex/values';

import { serverQuery } from '../_constructors';
import type { Doc } from '../_generated/dataModel';

/**
 * Key → flag read backing `FeatureFlag.findByKey`. `by_key` mirrors the Mongo unique index; the
 * miss contract is a plain `null` (the seam resolves it without throwing).
 *
 * @returns The flag row, or `null` when no flag carries the key.
 */
export const byKey = serverQuery({
    args: { key: v.string() },
    handler: async (ctx, { key }): Promise<Doc<'featureFlags'> | null> =>
        ctx.db
            .query('featureFlags')
            .withIndex('by_key', (q) => q.eq('key', key))
            .first(),
});

/**
 * Platform-global flag listing backing `FeatureFlag.findAll` (bulk evaluation and the admin flag
 * index). Flags are global rows, so no tenant scoping applies.
 *
 * @returns Every feature flag row.
 */
export const findAll = serverQuery({
    args: {},
    handler: async (ctx): Promise<Doc<'featureFlags'>[]> => ctx.db.query('featureFlags').collect(),
});
