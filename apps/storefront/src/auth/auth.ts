import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidShopifyCustomerAccountsApiConfiguration, UnknownCommerceProviderError } from '@nordcom/commerce-errors';

import NextAuth from 'next-auth';

import getAuthConfig from './auth.config';

/**
 * Instantiates the NextAuth handler for a given shop by wiring up the shop's
 * Shopify Customer Accounts API credentials. Throws early if the shop is not
 * on the Shopify provider or if customer auth is not configured.
 *
 * @param shop - The tenant shop record.
 * @returns The NextAuth handler bound to the shop's credentials.
 * @throws {UnknownCommerceProviderError} When the shop's commerce provider is not Shopify.
 * @throws {InvalidShopifyCustomerAccountsApiConfiguration} When the shop has no customer auth config.
 */
export function getAuth(shop: OnlineShop) {
    if (shop.commerceProvider.type !== 'shopify') {
        throw new UnknownCommerceProviderError();
    }

    const { customers } = shop.commerceProvider.authentication;
    if (!customers) {
        throw new InvalidShopifyCustomerAccountsApiConfiguration();
    }

    return NextAuth(
        getAuthConfig({
            shop,
            shopifyAuth: {
                shopId: customers.id,
                clientId: customers.clientId,
                clientSecret: customers.clientSecret,
            },
        }),
    );
}

/**
 * Get auth session for server components and API routes.
 *
 * @param shop - The shop to get the auth session for.
 * @returns The auth session.
 * @throws {UnknownCommerceProviderError} When the shop's commerce provider is not Shopify.
 * @throws {InvalidShopifyCustomerAccountsApiConfiguration} When the shop has no customer auth config.
 */
export async function getAuthSession(shop: OnlineShop) {
    return getAuth(shop).auth();
}
