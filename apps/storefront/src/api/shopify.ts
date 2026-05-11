import 'server-only';

import type { ApolloClient, QueryOptions } from '@apollo/client';
import { type OnlineShop, Shop } from '@nordcom/commerce-db';
import { UnknownCommerceProviderError } from '@nordcom/commerce-errors';
import { createStorefrontClient } from '@shopify/hydrogen-react';
import { headers } from 'next/headers';
import { experimental_taintUniqueValue } from 'react';
import type { ApiConfig } from '@/api/client';
import { createApolloClient } from '@/api/client';
import { ApiBuilder } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';

/**
 * Reads the buyer's forwarded IP from request headers. MUST be called outside any
 * `'use cache'` scope — Next.js 16 forbids `headers()` inside cached functions.
 * Pass the result to `ShopifyApolloApiClient({ shop, buyerIp })` when buyer-IP
 * routing matters (e.g. cart, checkout).
 */
export async function getBuyerIp(): Promise<string | undefined> {
    try {
        const head = await headers();
        return head.get('CF-Connecting-IP') || head.get('x-forwarded-for') || head.get('x-real-ip') || undefined;
    } catch {
        return undefined;
    }
}

export const ShopifyApiConfig = async ({
    shop: { domain },
    buyerIp,
}: {
    shop: OnlineShop;
    buyerIp?: string;
}): Promise<{
    public: () => ApiConfig;
    private: () => ApiConfig;
}> => {
    const { commerceProvider } = await Shop.findByDomain(domain, { sensitiveData: true });
    if (commerceProvider.type !== 'shopify') {
        throw new UnknownCommerceProviderError(commerceProvider.type);
    }

    experimental_taintUniqueValue(
        'Do not pass private tokens to the client',
        globalThis,
        commerceProvider.authentication.token,
    );
    if (commerceProvider.authentication.customers) {
        experimental_taintUniqueValue(
            'Do not pass private tokens to the client',
            globalThis,
            commerceProvider.authentication.customers.clientSecret,
        );
    }

    const api = createStorefrontClient({
        publicStorefrontToken: commerceProvider.authentication.publicToken,
        privateStorefrontToken: commerceProvider.authentication.token || undefined,
        storeDomain: commerceProvider.domain,
        contentType: 'json',
    });

    return {
        public: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPublicTokenHeaders({}),
        }),
        private: () => ({
            uri: api.getStorefrontApiUrl(),
            headers: api.getPrivateTokenHeaders({
                buyerIp: buyerIp || '::1', // FIXME: Ugly hack to silence warnings.
            }),
        }),
    };
};

type StorefrontApiConfig = Awaited<ReturnType<typeof ShopifyApiConfig>>;
type ShopifyApiOptions = {
    shop: OnlineShop;
    locale?: Locale;
    apiConfig?: StorefrontApiConfig;
    buyerIp?: string;
};

export const ShopifyApolloApiClient = async ({
    shop,
    locale = Locale.default,
    apiConfig,
    buyerIp,
}: ShopifyApiOptions) => {
    const configBuilder = apiConfig || (await ShopifyApiConfig({ shop, buyerIp }));

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
        api: createApolloClient(config, shop),
    });
};

/**
 * Shopify API client using the fetch API instead of Apollo.
 */
export const ShopifyApiClient = async ({ shop, locale = Locale.default, apiConfig, buyerIp }: ShopifyApiOptions) => {
    // TODO: Support public headers too.
    const config = (apiConfig || (await ShopifyApiConfig({ shop, buyerIp }))).private();

    return ApiBuilder({
        shop,
        locale,
        api: {
            query: async ({
                query,
                context: { fetchOptions, ...context } = {} as { fetchOptions?: unknown; [key: string]: unknown },
                variables,
            }: QueryOptions & { context?: { fetchOptions?: unknown; [key: string]: unknown } }) => {
                const response = await fetch(config.uri, {
                    method: 'POST',
                    headers: config.headers,
                    body: JSON.stringify({
                        ...(query && { query: (query as { loc?: { source?: { body?: string } } })?.loc?.source?.body }),
                        ...(variables && { variables }),
                        ...(context && { context }),
                    }),

                    // This handles cache, next options, etc.
                    ...(fetchOptions
                        ? { fetchOptions }
                        : {
                              fetchOptions: {
                                  revalidate: 28_800, // 8hrs.
                                  tags: ['shopify', `shopify.${shop.id}`, shop.domain],
                              },
                          }),

                    // TODO: context, e.g. locale
                });

                try {
                    const body = await response.json();

                    if (body.errors) {
                        return {
                            loading: false,
                            errors: body.errors,
                            data: body,
                        };
                    }

                    return {
                        loading: false,
                        data: body.data,
                        errors: null,
                    };
                } catch (error: unknown) {
                    return {
                        loading: false,
                        errors: [error],
                        data: null,
                    };
                }
            },
        } as unknown as ApolloClient<unknown>,
    });
};
