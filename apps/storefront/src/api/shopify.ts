import 'server-only';

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
    if ((commerceProvider as any)?.type !== 'shopify') {
        throw new UnknownCommerceProviderError();
    }

    const api = createStorefrontClient({
        publicStorefrontToken: commerceProvider.authentication.publicToken,
        privateStorefrontToken: commerceProvider.authentication.token || undefined,
        storeDomain: (commerceProvider as any)?.domain || undefined,
        contentType: 'json'
    });

    /**
     * @todo TODO: Should probably find a better way since this forces routes into dynamic
     * rendering unless dynamic has been set to`force-static`.
     */
    let buyerIp: string | undefined = undefined;
    try {
        buyerIp = headers().get('x-forwarded-for') || undefined;
    } catch {}

    return {
        public: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPublicTokenHeaders({})
        }),
        private: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPrivateTokenHeaders({
                buyerIp
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
        api: createApolloClient(config)
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
                    ...(fetchOptions ? { fetchOptions } : {})

                    // TODO: context, e.g. locale
                });

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
            }
        } as any
    });
};
