import type { TokenSet } from '@auth/core/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import { trace } from '@opentelemetry/api';
import type { OIDCConfig, OIDCUserConfig } from 'next-auth/providers';
import { BuildConfig } from '@/utils/build-config';

const GET_CUSTOMER_FOR_SESSION = /* GraphQL */ `
    query getCustomerForSession {
        customer {
            displayName
            imageUrl
        }
    }
`;

type UntypedValue = unknown;

/**
 * OIDC ID-token claims returned by the Shopify Customer Accounts API after a
 * successful OAuth authorization. Extended with an index signature to satisfy
 * Auth.js's `Profile` constraint.
 */
export interface ShopifyProfile extends Record<string, UntypedValue> {
    iss: string;
    sub: string;
    aud: string;
    exp: number;
    iat: number;
    auth_time: number;
    device_uuid: string;
    sid: string;
    dest: string;
    email: string;
    email_verified: boolean;
}

/**
 * Shopify-specific fields required to bootstrap the Customer Accounts OIDC
 * provider; extends or overrides the standard `OIDCConfig` shape.
 */
export interface ShopifyOwnConfig {
    shopId: string;
    clientId: string;
    clientSecret: string;
    issuer?: string;
    shopifyOAuthPath?: string;
    shopifyCustomerGraphqlPath?: string;
    nextAuthUrl?: string;
    nextAuthCallbackUrl?: string;
}

/**
 * Fully resolved Shopify OIDC provider configuration, merging Shopify's own
 * fields with the standard `OIDCConfig` shape (excluding the fields that
 * Shopify overrides with its own types).
 */
export interface ShopifyConfig<P extends ShopifyProfile>
    extends ShopifyOwnConfig,
        Omit<OIDCConfig<P>, 'clientId' | 'clientSecret' | 'issuer'> {}

/**
 * Caller-supplied configuration for `ShopifyProvider`. Only Shopify's own
 * fields are required; all standard OIDC fields are optional overrides.
 */
export type ShopifyUserConfig<P extends ShopifyProfile> = ShopifyOwnConfig &
    Partial<Omit<OIDCUserConfig<P>, 'options' | 'type'>>;

/**
 * This is the JWT returned by Shopify's customer API.
 */
export interface ShopifyJWTAuthorizationResponsePayload {
    shopId: string | number;
    cid: string;
    iat: number;
    exp: number;
    iss: string;
    sub: number;
    scope: 'openid email customer-account-api:full';
}

/**
 * This is the conformed JWT which will be actually validated.
 * Note that:
 *  - `aud` is originally missing, and it's expected to be the provider's `clientId`
 *  - `iss` is originally provided, but it's expected to be the provider's `issuer`
 */
export interface ShopifyJWTAuthorizationConformedPayload extends ShopifyJWTAuthorizationResponsePayload {
    aud: string;
}

/**
 * Builds a fully-configured Auth.js OIDC provider for Shopify's Customer
 * Accounts API. Handles endpoint construction, JWT conformance (Shopify's
 * id_token omits `aud` and uses a non-standard `iss`), and customer profile
 * fetching via the Customer GraphQL API.
 *
 * @param options - Shopify OAuth credentials and optional OIDC overrides.
 * @param shop - The tenant shop record, used to derive the callback URL.
 * @returns The resolved `ShopifyConfig` ready to be passed to `NextAuth`.
 */
function ShopifyProvider<P extends ShopifyProfile = ShopifyProfile>(
    options: ShopifyUserConfig<P>,
    shop: OnlineShop,
): ShopifyConfig<P> {
    const { shopId, clientId, clientSecret } = options;

    const endpointBase = `https://shopify.com/${shopId}/auth/oauth`;
    const issuer = `https://customer.login.shopify.com`;
    const callbackUrl = `https://${shop.domain}/api/auth/callback/shopify/`;
    const graphqlUrl = `https://shopify.com/${shopId}/account/customer/api/${BuildConfig.shopify.api}/graphql`;

    return {
        id: 'shopify',
        type: 'oidc',
        name: 'Shopify',
        shopId,
        clientId,
        clientSecret,
        client: {
            client_id: clientId,
            client_secret: clientSecret,
        },
        issuer,
        authorization: {
            url: `${endpointBase}/authorize`,
            params: {
                scope: 'openid email https://api.customers.com/auth/customer.graphql',
                client_id: clientId,
                response_type: 'code',
                redirect_uri: callbackUrl,
            },
        },
        token: {
            url: `${endpointBase}/token`,
            params: {
                grant_type: 'authorization_code',
                client_id: clientId,
                redirect_uri: callbackUrl,
                client_secret: clientSecret!,
            },
            /**
             * This function gets the `id_token` from the response and conforms it so
             * that it passes validation by adding/modifying the necessary claims.
             *
             * This solution feels a bit hacky and I'm not really sure it's fully correct,
             * safe, or if it will work in all cases (or if it'll hold up in the future).
             *
             * Note that the transformation is done in the `conform` function itself,
             * but since the caller expects a new `Response` object to be returned,
             * we need to patch the received `Response` with a `json` method that returns
             * the transformed data.
             */
            async conform(response: Response) {
                if (!response.ok) {
                    let responseBody: string | undefined;
                    try {
                        responseBody = await response.clone().text();
                    } catch {}
                    trace.getActiveSpan()?.addEvent('auth.shopify_provider_conform_failed', {
                        'http.status_code': response.clone().status,
                        'error.body': responseBody ?? '',
                    });
                    return undefined;
                }
                //? Assuming a lot about the response here, as it should
                //? return a JSON object with an `id_token` property with
                //? a valid JWT token.
                const data = (await response.clone().json()) as TokenSet;
                const [header = '', payload = '', sig = ''] = data.id_token?.split('.') ?? [];
                const responsePayload = JSON.parse(atob(payload)) as ShopifyJWTAuthorizationResponsePayload;
                const conformedPayload: ShopifyJWTAuthorizationConformedPayload = {
                    ...responsePayload,
                    aud: clientId,
                    iss: issuer,
                };
                const idToken = `${header}.${btoa(JSON.stringify(conformedPayload))}.${sig}`;
                //? Cloning the response again to patch it, though the caller already clones
                //? it before calling this function. This is done anyway in case this fact
                //? changes in the future and to avoid mutating the original response.
                return Object.assign(response.clone(), {
                    json() {
                        return Promise.resolve({ ...data, id_token: idToken });
                    },
                });
            },
        },
        idToken: true,
        checks: ['pkce', 'state'],
        async profile(profile, tokens) {
            const customer = tokens.access_token
                ? await fetch(graphqlUrl, {
                      method: 'POST',
                      cache: 'no-store',
                      headers: {
                          'Content-Type': 'application/json',
                          Authorization: tokens.access_token,
                      },
                      body: JSON.stringify({
                          operationName: 'getCustomerForSession',
                          query: GET_CUSTOMER_FOR_SESSION,
                          variables: {},
                      }),
                  })
                      .then(
                          (res) =>
                              res.json() as Promise<{
                                  data: {
                                      customer: {
                                          displayName: string;
                                          imageUrl: string | null;
                                      };
                                  };
                              }>,
                      )
                      .then((res) => res.data.customer)
                : null;

            return {
                id: profile.sub,
                email: profile.email,
                emailVerified: profile.email_verified ? new Date() : null,
                image: customer?.imageUrl,
                name: customer?.displayName,
            };
        },
        options,
    } satisfies ShopifyConfig<P>;
}

export default ShopifyProvider;
