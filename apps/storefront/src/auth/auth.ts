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

    const endpointBase = `https://shopify.com/${customers.id}/auth`;

    const { hostname } = new URL(`https://${shop.domain}`);
    const hostParts = hostname.split('.');
    const domain = `${hostParts.at(-2)}.${hostParts.at(-1)}`;

    return {
        ...getAuthConfig({
            domain,
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
        callbacks: {
            jwt({ token, account }: any /* TODO */) {
                if (account) {
                    token.id_token = account.id_token;
                    token.expires_at = account.expires_at;
                }

                // XXX: force token invalidation if expired
                const expiresAt = (token.expires_at as number | undefined) ?? 0;
                if (Date.now() > expiresAt * 1000) {
                    throw new Error('Session expired');
                }

                return token;
            }
        },
        events: {
            async signOut({ token }: any /* TODO */) {
                // trigger sign out on Shopify
                const signOutUrl = new URL(`${endpointBase}/account/logout`);
                if (token.id_token) {
                    signOutUrl.searchParams.append('id_token_hint', token.id_token as string);
                }

                await fetch(signOutUrl);
            }
        }
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
