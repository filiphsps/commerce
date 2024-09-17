import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidShopifyCustomerAccountsApiConfiguration, UnknownCommerceProviderError } from '@nordcom/commerce-errors';

import NextAuth from 'next-auth';

export type { Provider as AuthProvider } from 'next-auth/providers';

import getAuthConfig from './auth.config';

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
                clientSecret: customers.clientSecret
            }
        })
    );
}

/**
 * Get auth session for server components and API routes.
 *
 * @param {Shop} shop - The shop to get the auth session for.
 * @returns {Promise<Session>} The auth session.
 */
export async function getAuthSession(shop: OnlineShop) {
    return getAuth(shop).auth();
}
