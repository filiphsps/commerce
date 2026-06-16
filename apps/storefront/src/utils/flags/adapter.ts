import 'server-only';

import { randomUUID } from 'node:crypto';

import {
    InvalidShopifyCustomerAccountsApiConfiguration,
    MissingRequestContextError,
    UnknownCommerceProviderError,
} from '@nordcom/commerce-errors';
import type { Adapter } from 'flags';
import { dedupe } from 'flags/next';

import { getAuthSession } from '@/auth';
import { getRequestContext } from '@/utils/request-context';

import { type FlagEntities, mapSessionToUser } from './entities';
import { getFlagOverrides } from './overrides';
import { evaluatePredicate } from './predicates';

const identify = dedupe(
    async ({ headers, cookies }: { headers: Headers; cookies: { get(n: string): { value: string } | undefined } }) => {
        const ctx = await getRequestContext();
        if (!ctx) throw new MissingRequestContextError();
        // A tenant without customer-accounts config (e.g. the mock.shop demo) has no authenticated
        // customer — flags must still evaluate for the anonymous visitor rather than letting the
        // unconfigured-auth throw bubble up and crash any RSC that awaits a flag in its render path.
        let session: Awaited<ReturnType<typeof getAuthSession>> = null;
        try {
            session = await getAuthSession(ctx.shop);
        } catch (error) {
            if (
                !(error instanceof InvalidShopifyCustomerAccountsApiConfiguration) &&
                !(error instanceof UnknownCommerceProviderError)
            ) {
                throw error;
            }
        }
        const user = await mapSessionToUser(session);
        const visitorId =
            cookies.get('nordcom-visitor-id')?.value ?? headers.get('x-nordcom-visitor-id') ?? randomUUID();
        const entities: FlagEntities = {
            shop: ctx.shop,
            session,
            user,
            visitorId,
        };
        return entities;
    },
);

interface PopulatedFlag {
    key: string;
    defaultValue: unknown;
    targeting: Array<{ rule: string; params: Record<string, unknown>; value: unknown }>;
}

/**
 * Narrows an unknown DB entry to a flag document shape with `key` and `targeting` fields.
 *
 * @param flag - The raw value from a `featureFlags` relation entry.
 * @returns `true` when `flag` has both `key` and `targeting` properties; rejects null, primitives, and partially-shaped objects.
 */
function isPopulated(flag: unknown): flag is PopulatedFlag {
    return typeof flag === 'object' && flag !== null && 'key' in flag && 'targeting' in flag;
}

type ShopWithFlags = FlagEntities['shop'] & {
    featureFlags?: Array<{ flag: unknown }>;
};

/**
 * Builds the Vercel Flags SDK adapter that evaluates feature flag values against Convex-backed targeting rules.
 *
 * @returns An `Adapter<T, FlagEntities>` wired to the Nordcom identify function and targeting rule evaluator.
 */
export function nordcomFlagAdapter<T>(): Adapter<T, FlagEntities> {
    return {
        identify,
        // Namespaced keys (e.g. `section:hero`) contain a `:` — encode so the toolbar deep-link stays valid.
        origin: (key) => `/admin/feature-flags/${encodeURIComponent(key)}`,
        async decide({ key, entities, defaultValue }) {
            const overrides = await getFlagOverrides();
            if (overrides && Object.hasOwn(overrides, key)) return overrides[key] as T;
            if (!entities) return defaultValue as T;
            const shop = entities.shop as ShopWithFlags;
            const ref = shop.featureFlags?.find((entry) => isPopulated(entry.flag) && entry.flag.key === key);
            if (!ref || !isPopulated(ref.flag)) return defaultValue as T;
            const flagDoc = ref.flag;
            for (const rule of flagDoc.targeting) {
                if (evaluatePredicate(rule.rule, { ...rule.params, flagKey: key }, entities)) {
                    return rule.value as T;
                }
            }
            return flagDoc.defaultValue as T;
        },
    };
}
