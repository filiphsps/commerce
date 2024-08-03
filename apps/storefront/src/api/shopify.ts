import 'server-only';

import { type Shop, ShopApi } from '@nordcom/commerce-database';
import { UnknownCommerceProviderError } from '@nordcom/commerce-errors';

import { createApolloClient } from '@/api/client';
import { ApiBuilder } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { createStorefrontClient } from '@shopify/hydrogen-react';
import { unstable_cache as cache } from 'next/cache';

import type { ApiConfig } from '@/api/client';

export const ShopifyApiConfig = async ({
    shop: { domain },
    noCache = false
}: {
    shop: Shop;
    noCache?: boolean;
}): Promise<{
    public: () => ApiConfig;
    private: () => ApiConfig;
}> => {
    const { commerceProvider } = await ShopApi(domain, !noCache ? cache : undefined, true);
    if (!commerceProvider) throw new UnknownCommerceProviderError();

    const api = createStorefrontClient({
        publicStorefrontToken: commerceProvider.authentication.publicToken,
        privateStorefrontToken: commerceProvider.authentication.token || undefined,
        storeDomain: commerceProvider.domain,
        contentType: 'json'
    });

    // TODO: Find a way to get the buyer IP.
    let buyerIp: string | undefined = undefined;
    /*try {
        buyerIp = headers().get('x-forwarded-for') || undefined;
    } catch (error) {
        console.error(error);
    }*/

    return {
        public: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPublicTokenHeaders()
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
    shop: Shop;
    locale?: Locale;
    apiConfig?: StorefrontApiConfig;
    noCache?: boolean;
};

export const ShopifyApolloApiClient = async ({
    shop,
    locale = Locale.default,
    apiConfig,
    noCache
}: ShopifyApiOptions) => {
    'use server';

    // TODO: Support public headers too.
    const config = (apiConfig || (await ShopifyApiConfig({ shop, noCache }))).private();

    return ApiBuilder({
        shop,
        locale,
        api: createApolloClient(config)
    });
};

/**
 * Shopify API client using the fetch API instead of Apollo.
 */
export const ShopifyApiClient = async ({ shop, locale = Locale.default, apiConfig, noCache }: ShopifyApiOptions) => {
    'use server';

    // TODO: Support public headers too.
    const config = (apiConfig || (await ShopifyApiConfig({ shop, noCache }))).private();

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
