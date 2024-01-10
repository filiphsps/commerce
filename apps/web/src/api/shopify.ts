import 'server-only';

import type { ApiConfig } from '@/api/client';
import { setupApollo } from '@/api/client';
import { CommerceProviderAuthenticationApi, type Shop } from '@/api/shop';
import { ApiBuilder } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { UnknownCommerceProviderError } from '@nordcom/commerce-errors';
import { createStorefrontClient } from '@shopify/hydrogen-react';
import { headers } from 'next/headers';

export const ShopifyApiConfig = async ({
    shop,
    noHeaders = true,
    noCache
}: {
    shop: Shop;
    noHeaders?: boolean;
    noCache?: boolean;
}): Promise<{
    public: () => ApiConfig;
    private: () => ApiConfig;
}> => {
    const commerceProvider = await CommerceProviderAuthenticationApi({ shop, noCache });
    if (!shop.commerceProvider || !commerceProvider) throw new UnknownCommerceProviderError();

    const api = createStorefrontClient({
        publicStorefrontToken: commerceProvider.authentication.publicToken,
        privateStorefrontToken: commerceProvider.authentication.token || undefined,
        storeDomain: commerceProvider.domain,
        contentType: 'json'
    });

    let buyerIp: string | undefined = undefined;
    if (!noHeaders) {
        const clientHeaders = headers();
        buyerIp =
            clientHeaders.get('cf-connecting-ip') ||
            clientHeaders.get('x-forwarded-for') ||
            clientHeaders.get('x-real-ip') ||
            undefined;
    }

    return {
        public: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPublicTokenHeaders()
        }),
        private: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPrivateTokenHeaders({ buyerIp })
        })
    };
};

type StorefrontApiConfig = Awaited<ReturnType<typeof ShopifyApiConfig>>;
type ShopifyApiOptions = {
    shop: Shop;
    locale?: Locale;
    apiConfig?: StorefrontApiConfig;
};

export const ShopifyApolloApiClient = async ({ shop, locale = Locale.default, apiConfig }: ShopifyApiOptions) => {
    'use server';

    return ApiBuilder({
        shop,
        locale: locale,
        api: setupApollo((apiConfig || (await ShopifyApiConfig({ shop }))).private()).getClient()
    });
};

/**
 * Shopify API client using the fetch API instead of Apollo.
 */
export const ShopifyApiClient = async ({ shop, locale = Locale.default, apiConfig }: ShopifyApiOptions) => {
    return ApiBuilder({
        shop,
        locale,
        api: {
            query: async ({ query, context: { fetchOptions, ...context }, variables }: any) => {
                const config = (apiConfig || (await ShopifyApiConfig({ shop })))!.private()!;

                const response = await fetch(config.uri, {
                    method: 'POST',
                    headers: config.headers,
                    body: JSON.stringify({
                        ...(query && { query: query?.loc?.source?.body }),
                        ...(variables && { variables }),
                        ...(context && { context })
                    }),

                    // This handles cache, next options, etc.
                    ...(fetchOptions ? fetchOptions : {})

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
