'use server';

import 'server-only';

import { pingShopifyStorefront, type ShopifyPingResult } from './ping';

/**
 * Server action wrapping {@link pingShopifyStorefront} so the `'use client'` Shopify connect form can
 * validate a connection from the browser (the ping carries a token and must run server-side). Thin by
 * design — the verdict logic lives in the ping helper.
 *
 * @param args.storeDomain - The `*.myshopify.com` store domain.
 * @param args.publicToken - The Storefront API public access token.
 * @returns The ping verdict (`{ ok, shopName }` or `{ ok, error }`).
 */
export async function testShopifyConnection(args: {
    storeDomain: string;
    publicToken: string;
}): Promise<ShopifyPingResult> {
    return pingShopifyStorefront(args);
}
