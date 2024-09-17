import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import {
    InvalidShopError,
    InvalidShopifyCustomerAccountsApiConfiguration,
    UnknownCommerceProviderError
} from '@nordcom/commerce-errors';

import NextAuth from 'next-auth';

import type { NextAuthConfig } from 'next-auth';

export type { Provider as AuthProvider } from 'next-auth/providers';

import getAuthConfig from './auth.config';

export async function getAuthOptions({ shop }: { shop?: OnlineShop }): Promise<NextAuthConfig> {
    if (!shop) {
        throw new InvalidShopError();
    }

    if (shop.commerceProvider.type !== 'shopify') {
        throw new UnknownCommerceProviderError();
    }

    const { customers } = shop.commerceProvider.authentication;
    if (!customers) {
        throw new InvalidShopifyCustomerAccountsApiConfiguration();
    }

    return {
        ...getAuthConfig({
            domain: shop.domain,
            shop,
            shopifyAuth: {
                shopId: customers.id,
                clientId: customers.clientId,
                clientSecret: customers.clientSecret
            }
        }),
        /*pages: {
            signIn: `/account/login/`,
            signOut: `/account/logout/`,
            verifyRequest: `/account/login/`,
            error: '/account/login/' // Error code passed in query string as ?error=
        },*/
        callbacks: {},
        events: {}
    };
}

/**
 * Get auth session for server components and API routes.
 *
 * @param {Shop} shop - The shop to get the auth session for.
 * @returns {Promise<Session>} The auth session.
 */
export async function getAuthSession(shop: OnlineShop) {
    const authOptions = await getAuthOptions({ shop });

    return NextAuth(authOptions);
}
