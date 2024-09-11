import type { OnlineShop } from '@nordcom/commerce-db';
import { InvalidShopifyCustomerAccountsApiConfiguration } from '@nordcom/commerce-errors';

import { BuildConfig } from '@/utils/build-config';
import { cookies } from 'next/headers';

import type { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';

export const SHOPIFY_CUSTOMER_ACCOUNT_ACCESS_TOKEN_COOKIE = 'SHOPIFY_ACCOUNT_ACCESS_TOKEN';
const VERCEL_DEPLOYMENT = process.env.VERCEL_URL;

interface ShopifyCustomer {
    id: string;
    displayName: string;
    emailAddress: {
        emailAddress: string;
    };
}

const getCustomerGql = /* GraphQL */ `
    query getCustomerForSession {
        customer {
            id
            displayName
            emailAddress {
                emailAddress
            }
        }
    }
`;

const ShopifyProvider = (
    options: OAuthUserConfig<ShopifyCustomer>,
    customers: { id: string; clientId: string; clientSecret: string },
    shop: OnlineShop
): OAuthConfig<ShopifyCustomer> => {
    if (!customers) {
        throw new InvalidShopifyCustomerAccountsApiConfiguration();
    }

    const endpointBase = `https://shopify.com/${customers.id}/auth`;

    const { hostname } = new URL(`https://${shop.domain}`);
    const hostParts = hostname.split('.');
    const domain = `${hostParts.at(-2)}.${hostParts.at(-1)}`;

    return {
        id: 'shopify',
        name: 'Shopify',
        type: 'oauth',
        checks: ['pkce', 'state'],
        authorization: {
            url: `${endpointBase}/oauth/authorize`,
            params: {
                scope: 'openid email https://api.customers.com/auth/customer.graphql',
                response_type: 'code'
            }
        },
        token: {
            async request({ params, provider }: any /* TODO */) {
                if (!params.code) {
                    throw new Error('code search params is missing');
                }

                const tokenResponse = await fetch(`${endpointBase}/oauth/token`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        grant_type: 'authorization_code',
                        client_id: provider.clientId!,
                        client_secret: provider.clientSecret!, // XXX: Not a standard parameter, but Shopify requires it...
                        redirect_uri: provider.callbackUrl,
                        code: params.code
                    })
                });

                if (!tokenResponse.ok) {
                    throw new Error(
                        `${tokenResponse.status} (RequestID ${tokenResponse.headers.get(
                            'x-request-id'
                        )}): ${await tokenResponse.text()}`
                    );
                }

                interface AccessTokenResponse {
                    access_token: string;
                    expires_in: number; // in seconds
                    id_token: string;
                    refresh_token: string;
                }
                const {
                    access_token: subject_token,
                    expires_in,
                    id_token,
                    refresh_token
                } = (await tokenResponse.json()) as AccessTokenResponse;

                // Exchange access token
                const exchangeTokenResponse = await fetch(`${endpointBase}/oauth/token`, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
                        client_id: provider.clientId!,
                        client_secret: provider.clientSecret!, // XXX: Not a standard parameter, but Shopify requires it...
                        subject_token,
                        audience: '30243aa5-17c1-465a-8493-944bcc4e88aa',
                        subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
                        scopes: 'https://api.customers.com/auth/customer.graphql'
                    })
                });

                if (!exchangeTokenResponse.ok) {
                    throw new Error(
                        `${exchangeTokenResponse.status} (RequestID ${exchangeTokenResponse.headers.get(
                            'x-request-id'
                        )}): ${await exchangeTokenResponse.text()}`
                    );
                }

                interface ExchangeAccessTokenResponse {
                    access_token: string;
                    expires_in: number;
                    error?: string;
                    error_description?: string;
                }
                const data = (await exchangeTokenResponse.json()) as ExchangeAccessTokenResponse;

                if (data.error) {
                    throw new Error(data.error_description);
                }

                // store access token into cookies so we can retrieve it when calling customer account api in server and client
                cookies().set(SHOPIFY_CUSTOMER_ACCOUNT_ACCESS_TOKEN_COOKIE, data.access_token, {
                    httpOnly: true,
                    sameSite: 'lax',
                    path: '/',
                    domain: !!VERCEL_DEPLOYMENT ? `.${domain}` : undefined,
                    secure: !!VERCEL_DEPLOYMENT,
                    expires: Date.now() + expires_in * 1000
                });

                return {
                    tokens: {
                        access_token: data.access_token,
                        id_token,
                        refresh_token,
                        expires_in
                    }
                };
            }
        },
        userinfo: {
            async request({ tokens }: any /* TODO */) {
                if (!tokens.access_token) {
                    throw new Error('access token is missing');
                }

                const response = await fetch(
                    `https://shopify.com/${customers.id}/account/customer/api/${BuildConfig.shopify.api}/graphql`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': tokens.access_token
                        },
                        body: JSON.stringify({
                            operationName: 'GetCustomerForSession',
                            query: getCustomerGql,
                            variables: {}
                        })
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `${response.status} (RequestID ${response.headers.get(
                            'x-request-id'
                        )}): ${await response.text()}`
                    );
                }

                interface GraphQLResponse {
                    data: { customer: any }; // XXX: ShopifyCustomer is not matched to Profile interface that next-auth expects
                }
                const { data } = (await response.json()) as GraphQLResponse;
                return data.customer;
            }
        },
        profile: async (profile) => {
            return {
                id: profile.id,
                name: profile.displayName,
                email: profile.emailAddress.emailAddress,
                image: null
            };
        }
        //options // FIXME.
    };
};

export default ShopifyProvider;
