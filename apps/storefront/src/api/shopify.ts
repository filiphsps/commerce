import 'server-only';

import { experimental_taintUniqueValue } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { UnknownCommerceProviderError } from '@nordcom/commerce-errors';

import { createApolloClient } from '@/api/client';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ApiBuilder } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { createStorefrontClient } from '@shopify/hydrogen-react';
import { headers } from 'next/headers';

import type { ApiConfig } from '@/api/client';

export const ShopifyApiConfig = async ({
    shop: { domain }
}: {
    shop: OnlineShop;
}): Promise<{
    public: () => ApiConfig;
    private: () => ApiConfig;
}> => {
    const { commerceProvider } = await findShopByDomainOverHttp(domain);
    if (commerceProvider.type !== 'shopify') {
        throw new UnknownCommerceProviderError(commerceProvider.type);
    }

    experimental_taintUniqueValue(
        'Do not pass private tokens to the client',
        globalThis,
        commerceProvider.authentication.token
    );
    if (commerceProvider.authentication.customers) {
        experimental_taintUniqueValue(
            'Do not pass private tokens to the client',
            globalThis,
            commerceProvider.authentication.customers.clientSecret
        );
    }

    const api = createStorefrontClient({
        publicStorefrontToken: commerceProvider.authentication.publicToken,
        privateStorefrontToken: commerceProvider.authentication.token || undefined,
        storeDomain: commerceProvider.domain,
        contentType: 'json'
    });

    /**
     * @todo TODO: Should probably find a better way since this forces routes into
     * dynamic rendering unless dynamic has been set to `force-static`.
     */
    let buyerIp: string | undefined = undefined;
    try {
        const head = await headers();

        const forwarded =
            head.get('CF-Connecting-IP') || head.get('x-forwarded-for') || head.get('x-real-ip') || undefined;
        if (forwarded) {
            buyerIp = forwarded;
        }
    } catch {} // Discard errors.

    return {
        public: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPublicTokenHeaders({})
        }),
        private: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPrivateTokenHeaders({
                buyerIp: buyerIp || '::1' // FIXME: Ugly hack to silence warnings.
            })
        })
    };
};

type StorefrontApiConfig = Awaited<ReturnType<typeof ShopifyApiConfig>>;
type ShopifyApiOptions = {
    shop: OnlineShop;
    locale?: Locale;
    apiConfig?: StorefrontApiConfig;
};

export const ShopifyApolloApiClient = async ({ shop, locale = Locale.default, apiConfig }: ShopifyApiOptions) => {
    const configBuilder = apiConfig || (await ShopifyApiConfig({ shop }));

    let config: ApiConfig | null = null;
    try {
        config = configBuilder.private();
    } catch {}

    if (!config) {
        // Fallback to public headers.
        config = configBuilder.public();
        console.warn('Falling back to public headers for Shopify API client.');
    }

    return ApiBuilder({
        shop,
        locale,
        api: createApolloClient(config, shop)
    });
};

/**
 * Shopify API client using the fetch API instead of Apollo.
 */
export const ShopifyApiClient = async ({ shop, locale = Locale.default, apiConfig }: ShopifyApiOptions) => {
    // TODO: Support public headers too.
    const config = (apiConfig || (await ShopifyApiConfig({ shop }))).private();

    return ApiBuilder({
        shop,
        locale,
        api: {
            query: async ({ query, context: { fetchOptions, ...context }, variables }: any) => {
                const response = await fetch(config.uri, {
                    method: 'POST',
                    headers: config.headers,
                    body: JSON.stringify({
                        ...(query && { query: query?.loc?.source?.body }),
                        ...(variables && { variables }),
                        ...(context && { context })
                    }),

                    // This handles cache, next options, etc.
                    ...(fetchOptions
                        ? { fetchOptions }
                        : {
                              fetchOptions: {
                                  revalidate: 28_800, // 8hrs.
                                  tags: ['shopify', `shopify.${shop.id}`, shop.domain]
                              }
                          })

                    // TODO: context, e.g. locale
                });

                try {
                    const body = await response.json();

                    if (body.errors) {
                        return {
                            loading: false,
                            errors: body.errors,
                            data: body
                        };
                    }

                    return {
                        loading: false,
                        data: body.data,
                        errors: null
                    } as any;
                } catch (error: unknown) {
                    return {
                        loading: false,
                        errors: [error],
                        data: null
                    };
                }
            }
        } as any
    });
};
