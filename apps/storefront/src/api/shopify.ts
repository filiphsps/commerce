import 'server-only';

import type { ApolloClient, QueryOptions } from '@apollo/client';
import { type OnlineShop, Shop } from '@nordcom/commerce-db';
import { ShopMisconfigurationError, UnknownCommerceProviderError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import { createStorefrontClient } from '@shopify/hydrogen-react';
import { experimental_taintUniqueValue } from 'react';
import { getApolloClient } from '@/api/_apollo-pool';
import type { ApiConfig } from '@/api/client';
import { createApolloClient } from '@/api/client';
import { tenantRootTags } from '@/cache';
import { ApiBuilder } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { unsafe_cast } from '@/utils/unsafe-cast';

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

    // A Shopify-typed commerce provider without auth data is a misconfiguration,
    // not a transient failure. Surface it loudly here rather than letting it
    // surface as a React #495 (taint of undefined) or a downstream "missing
    // storefront token" inside Hydrogen's client.
    const { token, publicToken, customers } = commerceProvider.authentication;
    if (!publicToken || !token || !commerceProvider.domain) {
        const missingFields = [
            !publicToken && 'authentication.publicToken',
            !token && 'authentication.token',
            !commerceProvider.domain && 'domain',
        ].filter((v): v is string => Boolean(v));
        throw new ShopMisconfigurationError(domain, missingFields);
    }

    experimental_taintUniqueValue('Do not pass private tokens to the client', globalThis, token);
    if (customers?.clientSecret) {
        experimental_taintUniqueValue('Do not pass private tokens to the client', globalThis, customers.clientSecret);
    }

    const api = createStorefrontClient({
        publicStorefrontToken: publicToken,
        privateStorefrontToken: token,
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

    const api = getApolloClient({
        shop,
        locale,
        factory: () => {
            let config: ApiConfig | null = null;
            try {
                config = configBuilder.private();
            } catch (privateConfigError) {
                // Empty-catch previously hid every reason the private headers failed
                // — bad/expired admin token, mis-configured shop, missing IP — and
                // the storefront silently downgraded to public-only access in prod
                // with nothing in the logs but a generic "falling back" line.
                trace.getActiveSpan()?.addEvent('shopify.private_headers_unavailable', {
                    'error.message':
                        privateConfigError instanceof Error ? privateConfigError.message : String(privateConfigError),
                    'shop.domain': shop.domain,
                });
            }
            if (!config) config = configBuilder.public();
            return createApolloClient(config, shop);
        },
    });

    return ApiBuilder({ shop, locale, api });
};

/**
 * Shopify API client using the fetch API instead of Apollo.
 */
export const ShopifyApiClient = async ({ shop, locale = Locale.default, apiConfig, buyerIp }: ShopifyApiOptions) => {
    // TODO: Support public headers too.
    const config = (apiConfig || (await ShopifyApiConfig({ shop, buyerIp }))).private();

    // This fetch-based stub implements only the `query` method consumed by
    // ApiBuilder; the rest of the ApolloClient surface is never called on
    // this path. unsafe_cast bridges the structural gap to the full ApolloClient type.
    const fetchClient = unsafe_cast<ApolloClient>({
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
                              tags: tenantRootTags(shop),
                          },
                      }),

                // TODO: context, e.g. locale
            });

            try {
                const body = await response.json();

                if (body.errors) {
                    // The previous code returned `data: body` here — the
                    // entire response, errors included. Callers that
                    // checked `if (data)` saw truthy data and went on to
                    // render `body.data` paths that didn't exist, turning
                    // a GraphQL error into a mysterious render-side crash.
                    return {
                        loading: false,
                        errors: body.errors,
                        data: body.data ?? null,
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
    });

    return ApiBuilder({
        shop,
        locale,
        api: fetchClient,
    });
};
