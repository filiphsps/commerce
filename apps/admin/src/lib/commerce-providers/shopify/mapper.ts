import type { CommerceProvider } from '@nordcom/commerce-db';

import { normalizeHostname } from '@/lib/new-shop/validation';

/** Field keys the Shopify manual connect form collects. `storefrontId` is the optional advanced field. */
export type ShopifyConnectValues = {
    storeDomain: string;
    publicToken: string;
    privateToken: string;
    storefrontId?: string;
};

/**
 * Maps the manual Shopify connect values into the stored `commerceProvider` shape. The secret private
 * token is placed on `authentication.token`; `Shop.create` (`splitCommerceProvider`) shreds it into the
 * split-out `shopCredentials` table, so the public shop row never carries it. `storefrontId` and `id`
 * are required non-empty strings — both default to the store domain when no explicit storefront id is
 * given (the storefront's analytics path reads `storefrontId || id`, so a stable domain string is a
 * safe fallback the operator can refine later).
 *
 * @param values - The collected connect-form values (loosely typed; missing keys default to empty).
 * @returns The Shopify `commerceProvider`, secret token included.
 */
export function shopifyToCommerceProvider(values: Record<string, string>): CommerceProvider {
    const storeDomain = normalizeHostname(values.storeDomain ?? '');
    const storefrontId = (values.storefrontId ?? '').trim() || storeDomain;
    return {
        type: 'shopify',
        authentication: {
            token: (values.privateToken ?? '').trim(),
            publicToken: (values.publicToken ?? '').trim(),
            domain: storeDomain,
        },
        storefrontId,
        domain: storeDomain,
        id: storeDomain,
    };
}
