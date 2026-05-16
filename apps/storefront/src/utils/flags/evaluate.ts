import 'server-only';

import type { FeatureFlagBase, OnlineShop } from '@nordcom/commerce-db';
import type { FlagEntities } from './entities';
import type { FlagOverrides } from './overrides';
import { evaluatePredicate, getPredicateMetadata } from './predicates';
import { reportFlagValue } from './report';

export interface EvaluateShopFlagOptions<T> {
    /** Overrides decoded at the uncached boundary via getFlagOverrides(). */
    overrides?: FlagOverrides | null;
    /** Optional partial entities; used for predicates that can run without full identify (e.g. percentage). */
    entitiesPartial?: Partial<Omit<FlagEntities, 'shop'>>;
    /** Fallback when the shop has no ref to this flag — typically the code-side `flag()` declaration's defaultValue. */
    codeDefaultValue?: T;
}

type ShopWithFlags = OnlineShop & {
    featureFlags?: Array<{ flag: FeatureFlagBase }>;
};

/**
 * Synchronous, cache-safe flag evaluation.
 *
 * **Constraint:** must NOT call `next/headers` `headers()` / `cookies()` — that's
 * forbidden inside `'use cache'` scopes. All request-scoped data arrives via
 * arguments (`shop`, `overrides`, `entitiesPartial`).
 *
 * Predicates declared with `requiresUser: true` are skipped here because the
 * user/session is not available without reading request data. For user-targeted
 * flags, read via the SDK's `flag()` outside a cached scope.
 */
export function evaluateShopFlag<T>(shop: OnlineShop, key: string, options: EvaluateShopFlagOptions<T> = {}): T {
    const value = decide<T>(shop as ShopWithFlags, key, options);
    reportFlagValue(key, value);
    return value;
}

function decide<T>(shop: ShopWithFlags, key: string, options: EvaluateShopFlagOptions<T>): T {
    if (options.overrides && Object.hasOwn(options.overrides, key)) {
        return options.overrides[key] as T;
    }

    const ref = shop.featureFlags?.find((entry) => entry.flag?.key === key);
    if (!ref) return options.codeDefaultValue as T;

    const flagDoc = ref.flag;
    const partialEntities: FlagEntities = {
        shop,
        session: null,
        user: null,
        visitorId: options.entitiesPartial?.visitorId ?? '',
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
