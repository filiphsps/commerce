import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';

import type { FlagEntities } from './entities';
import { evaluatePredicate, getPredicateMetadata } from './predicates';
import { reportFlagValue } from './report';

interface PopulatedFlag {
    key: string;
    defaultValue: unknown;
    targeting: Array<{ rule: string; params: Record<string, unknown>; value: unknown }>;
}

/**
 * Narrows a featureFlags entry to a resolved flag document with `key` and `targeting` fields.
 *
 * @param flag - The raw value from a `featureFlags` array entry.
 * @returns `true` when the entry is a populated object with `key` and `targeting`; rejects unpopulated refs and primitives.
 */
function isPopulated(flag: unknown): flag is PopulatedFlag {
    return typeof flag === 'object' && flag !== null && 'key' in flag && 'targeting' in flag;
}

type ShopWithFlags = OnlineShop & {
    featureFlags?: Array<{ flag: unknown }>;
};

/**
 * Synchronous, cache-safe flag evaluation. Internal helper for `defineFlag`.
 *
 * Constraints (documented to callers via `DefinedFlag.evaluate` JSDoc):
 *  - No cookies/headers reads; safe inside `'use cache'` scopes.
 *  - Overrides (vercel-flag-overrides cookie) are not consulted.
 *  - Predicates with `requiresUser: true` are skipped.
 *  - Percentage rollouts bucket deterministically (no visitorId).
 *  - Expects `shop` loaded via `Shop.findByDomain(..., { populate: ['featureFlags.flag'] })` — refs are introspected by shape, not by their nominal `FeatureFlagRef` type.
 *
 * @param shop - The shop record with `featureFlags` populated (refs resolved to documents).
 * @param key - The flag key to look up in the shop's feature flag list.
 * @param defaultValue - Returned when no flag document or matching targeting rule is found.
 * @returns The resolved flag value.
 */
export function evaluateShopFlagSync<T>(shop: OnlineShop, key: string, defaultValue: T): T {
    const value = decide<T>(shop as ShopWithFlags, key, defaultValue);
    reportFlagValue(key, value);
    return value;
}

/**
 * Walks a shop's populated targeting rules and returns the first matching rule's value, or the flag's `defaultValue`.
 *
 * @param shop - The shop record with `featureFlags` populated.
 * @param key - The flag key to locate.
 * @param defaultValue - Returned when no flag document exists or no targeting rule matches.
 * @returns The resolved flag value.
 */
// Value-type integrity (T matching stored rule/default value) is enforced by the defineFlag declaration's `defaultValue: T` — not by runtime validation here.
function decide<T>(shop: ShopWithFlags, key: string, defaultValue: T): T {
    const ref = shop.featureFlags?.find((entry) => isPopulated(entry.flag) && entry.flag.key === key);
    if (!ref || !isPopulated(ref.flag)) return defaultValue;

    const flagDoc = ref.flag;
    const partialEntities: FlagEntities = {
        shop,
        session: null,
        user: null,
        visitorId: '',
    };

    for (const rule of flagDoc.targeting) {
        const meta = getPredicateMetadata(rule.rule);
        if (meta?.requiresUser) continue;
        if (evaluatePredicate(rule.rule, { ...rule.params, flagKey: key }, partialEntities)) {
            return rule.value as T;
        }
    }
    return flagDoc.defaultValue as T;
}
