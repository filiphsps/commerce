import 'server-only';

import type { ApolloClient, QueryOptions } from '@apollo/client';
import type { OnlineShop } from '@nordcom/commerce-db';
import { ShopMisconfigurationError, UnknownCommerceProviderError } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import { createStorefrontClient } from '@shopify/hydrogen-react';
import { experimental_taintUniqueValue } from 'react';
import { getApolloClient } from '@/api/_apollo-pool';
// The React-cached Shop loader (leaf module): `findByDomain` normalizes the
// options arg to primitive keys so the per-render `cache()` dedup actually hits,
// collapsing repeated tenant lookups — this hot path runs for every Storefront
// client — to a single backend round-trip per render pass.
import { Shop } from '@/api/_shop-loader';
import type { ApiConfig } from '@/api/client';
import { createApolloClient } from '@/api/client';
import { tenantRootTags } from '@/cache';
import { ApiBuilder } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { unsafe_cast } from '@/utils/unsafe-cast';

/**
 * Builds the Shopify Storefront API endpoint and header factory for a tenant.
 *
 * @param options - Config options.
 * @param options.shop - Tenant record; only `domain` is read here.
 * @param options.buyerIp - Optional buyer IP forwarded to the private-access endpoint for analytics.
 * @returns An object with `public()` and `private()` factory methods each returning an `ApiConfig`.
 * @throws {UnknownCommerceProviderError} When the shop's commerce provider is not Shopify.
 * @throws {ShopMisconfigurationError} When required authentication fields are missing from the provider record.
 */
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

/**
 * Returns the Apollo-backed Shopify API client for a tenant + locale, pooled for request lifetime.
 *
 * @param options - Client options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale; defaults to `Locale.default`.
 * @param options.apiConfig - Pre-resolved API config; fetched from Shopify when omitted.
 * @param options.buyerIp - Forwarded to the private storefront endpoint.
 * @returns An `AbstractApi`-compatible builder wrapping the pooled Apollo client.
 * @throws {UnknownCommerceProviderError} When the shop is not a Shopify tenant.
 * @throws {ShopMisconfigurationError} When Shopify authentication credentials are incomplete.
 */
export const ShopifyApolloApiClient = async ({
    shop,
    locale = Locale.default,
    apiConfig,
    buyerIp,
}: ShopifyApiOptions) => {
    const api = await getApolloClient({
        shop,
        locale,
        // Resolve config INSIDE the factory so it runs only on a pool miss. The
        // previous code awaited ShopifyApiConfig (a `Shop.findByDomain` DB
        // round-trip + Hydrogen client construction) before the pool lookup, so
        // a pool hit still paid that cost on every request — pooling saved the
        // InMemoryCache but not the per-call work.
        factory: async () => {
            const configBuilder = apiConfig || (await ShopifyApiConfig({ shop, buyerIp }));

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
 *
 * @param options - Client options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale; defaults to `Locale.default`.
 * @param options.apiConfig - Pre-resolved API config; fetched from Shopify when omitted.
 * @param options.buyerIp - Forwarded to the private storefront endpoint.
 * @returns An `AbstractApi`-compatible builder wrapping the fetch-based client.
 * @throws {UnknownCommerceProviderError} When the shop is not a Shopify tenant.
 * @throws {ShopMisconfigurationError} When Shopify authentication credentials are incomplete.
 */
export const ShopifyApiClient = async ({ shop, locale = Locale.default, apiConfig, buyerIp }: ShopifyApiOptions) => {
    const configBuilder = apiConfig || (await ShopifyApiConfig({ shop, buyerIp }));

    // Mirror ShopifyApolloApiClient's private→public fallback: a bad/expired admin token or
    // incomplete private credentials shouldn't 500 the public read paths that use this client
    // (sitemaps, static params, css-variables) — degrade to public headers with a trace breadcrumb.
    let config: ApiConfig | null = null;
    try {
        config = configBuilder.private();
    } catch (privateConfigError) {
        trace.getActiveSpan()?.addEvent('shopify.private_headers_unavailable', {
            'error.message':
                privateConfigError instanceof Error ? privateConfigError.message : String(privateConfigError),
            'shop.domain': shop.domain,
        });
    }
    if (!config) config = configBuilder.public();

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
