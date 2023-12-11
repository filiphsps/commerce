import 'server-only';

import { CommerceProviderAuthenticationApi, type Shop } from '@/api/shop';
import ShopifyProvider from '@/auth/shopify-provider';
import { InvalidShopError, InvalidShopifyCustomerAccountsApiConfiguration } from '@/utils/errors';
import { getServerSession, type AuthOptions } from 'next-auth';

const VERCEL_DEPLOYMENT = process.env.VERCEL_URL;

export const getAuthOptions = async ({ shop }: { shop?: Shop }): Promise<AuthOptions> => {
    if (!shop) throw new InvalidShopError();

    const { customers } = await CommerceProviderAuthenticationApi({ shop });
    if (!customers) throw new InvalidShopifyCustomerAccountsApiConfiguration();

    const endpointBase = `https://shopify.com/${customers.id}/auth`;

    const { hostname } = new URL(`https://${shop.domains.primary}`);
    const hostParts = hostname.split('.');
    const domain = `${hostParts.at(-2)}.${hostParts.at(-1)}`;

    return {
        providers: [
            ShopifyProvider(
                {
                    clientId: customers.clientId,
                    clientSecret: customers.clientSecret
                },
                customers,
                shop
            )
        ],
        pages: {
            signIn: `/account/login/`,
            signOut: `/account/logout/`,
            verifyRequest: `/account/login/`,
            error: '/account/login/' // Error code passed in query string as ?error=
        },
        callbacks: {
            jwt({ token, account }) {
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
            async signOut({ token }) {
                // trigger sign out on Shopify
                const signOutUrl = new URL(`${endpointBase}/account/logout`);
                if (token.id_token) {
                    signOutUrl.searchParams.append('id_token_hint', token.id_token as string);
                }

                await fetch(signOutUrl);
            }
        },
        cookies: {
            sessionToken: {
                name: `${VERCEL_DEPLOYMENT ? '__Secure-' : ''}nordcom-commerce.store.session-token`,
                options: {
                    httpOnly: true,
                    sameSite: 'lax',
                    path: '/',
                    // When working on localhost, the cookie domain must be omitted entirely (https://stackoverflow.com/a/1188145)
                    domain: !!VERCEL_DEPLOYMENT ? `.${domain}` : undefined,
                    secure: !!VERCEL_DEPLOYMENT
                }
            }
        },
        debug: false
    };
};

/**
 * Get auth session for server components and API routes.
 *
 * @param {Shop} shop - The shop to get the auth session for.
 * @returns {Promise<Session>} The auth session.
 */
export const getAuthSession = async (shop: Shop) => {
    const authOptions = await getAuthOptions({ shop });

    return getServerSession(authOptions);
};
