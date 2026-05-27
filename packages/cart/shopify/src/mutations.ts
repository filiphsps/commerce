import type { CartMutation } from '@nordcom/cart-core';

/**
 * Builders for shopify-specific custom mutations the kernel can submit
 * alongside its standard verbs. Each builder returns a discriminated
 * `CartMutation` so the kernel can route to the matching handler declared
 * by `createShopifyCartAdapter`'s `customMutations` map.
 */
export const shopifyMutations = {
    /**
     * Reuses Shopify's `cartBuyerIdentityUpdate` mutation to set just the
     * buyer country — surfaced as a custom mutation (rather than a full
     * `updateBuyerIdentity` call) so hosts can change shipping country
     * without first reconstructing the rest of the buyer identity.
     *
     * @param args.country - ISO 3166-1 alpha-2 country code; the adapter
     *   handler upper-cases it before sending to Shopify.
     * @returns Custom-kind cart mutation routed to `updateBuyerCountry`.
     */
    updateBuyerCountry(args: { country: string }): CartMutation {
        return { kind: 'custom', name: 'updateBuyerCountry', payload: args };
    },
};
