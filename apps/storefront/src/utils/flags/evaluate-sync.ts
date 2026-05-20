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
 */
export function evaluateShopFlagSync<T>(shop: OnlineShop, key: string, defaultValue: T): T {
    const value = decide<T>(shop as ShopWithFlags, key, defaultValue);
    reportFlagValue(key, value);
    return value;
}

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
