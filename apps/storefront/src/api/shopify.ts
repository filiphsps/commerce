import type { Shop } from '@nordcom/commerce-database';
import { UnknownCommerceProviderError } from '@nordcom/commerce-errors';

import { type ApiConfig, createApolloClient } from '@/api/client';
import { ApiBuilder } from '@/utils/abstract-api';
import { Locale } from '@/utils/locale';
import { createStorefrontClient } from '@shopify/hydrogen-react';

export const PRODUCT_FRAGMENT_MINIMAL = `
    id
    handle
    availableForSale
    createdAt
    title
    description
    vendor
    tags
    trackingParameters
    seo {
        description
    }
    priceRange {
        maxVariantPrice {
            amount
            currencyCode
        }
        minVariantPrice {
            amount
            currencyCode
        }
    }
    options(first: 3) {
        id
        name
        values
    }
    sellingPlanGroups(first: 3) {
        edges {
            node {
                name
            }
        }
    }
    variants(first: 3) {
        edges {
            node {
                id
                title
                price {
                    amount
                    currencyCode
                }
                compareAtPrice {
                    amount
                    currencyCode
                }
                availableForSale
                currentlyNotInStock
                quantityAvailable
                weight
                weightUnit
                image {
                    id
                }
                selectedOptions {
                    name
                    value
                }
            }
        }
    }
    images(first: 5) {
        edges {
            node {
                id
                altText
                url
                height
                width
            }
        }
    }
`;

export const PRODUCT_FRAGMENT = `
    id
    handle
    availableForSale
    createdAt
    updatedAt
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    trackingParameters
    seo {
        title
        description
    }
    priceRange {
        maxVariantPrice {
            amount
            currencyCode
        }
        minVariantPrice {
            amount
            currencyCode
        }
    }
    options(first: 250) {
        id
        name
        values
    }
    sellingPlanGroups(first: 250) {
        edges {
            node {
                appName
                name
                options {
                    name,
                    values
                }
            }
        }
    }
    variants(first: 250) {
        edges {
            node {
                id
                sku
                title
                barcode
                price {
                    amount
                    currencyCode
                }
                compareAtPrice {
                    amount
                    currencyCode
                }
                availableForSale
                weight
                weightUnit
                image {
                    id
                }
                selectedOptions {
                    name
                    value
                }
            }
        }
    }
    images(first: 250) {
        edges {
            node {
                id
                altText
                url
                height
                width
            }
        }
    }
    originalName: metafield(namespace: "store", key: "original-name") {
        value
    }

    keywords: metafield(namespace: "store", key: "keywords") {
        value
    }

    nutritionalContent: metafield(namespace: "store", key: "nutritional_content") {
        id
        namespace

        value
        type
    }
    allergyInformation: metafield(namespace: "store", key: "allergy_information") {
        id
        namespace

        value
        type
    }

    ingredients: metafield(namespace: "store", key: "ingredients") {
        id
        namespace

        value
        type
    }
    flavors: metafield(namespace: "store", key: "flavors") {
        id
        namespace

        value
        type
    }
`;

export type ShopifyApiOptions = {
    shop: Shop;
    locale?: Locale;
    apiConfig?: ApiConfig;
    noCache?: boolean;
};

/**
 * Shopify API client using the fetch API instead of Apollo.
 */
export const ShopifyApiClient = async ({ shop, locale = Locale.default, apiConfig, noCache }: ShopifyApiOptions) => {
    // TODO: Support public headers too.
    const config = apiConfig || (await ShopifyApiConfig({ shop })).private();

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

export const ShopifyApiConfig = async ({
    shop: { commerceProvider }
}: {
    shop: Shop;
}): Promise<{
    public: () => ApiConfig;
    private: () => ApiConfig;
}> => {
    if (!commerceProvider) throw new UnknownCommerceProviderError();

    const token = commerceProvider.authentication.token || undefined;

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

    const getPublic = () => ({
        uri: api.getStorefrontApiUrl(),
        headers: api.getPublicTokenHeaders()
    });
    const getPrivate = () => ({
        uri: api.getStorefrontApiUrl(),
        headers: api.getPrivateTokenHeaders({
            buyerIp
        })
    });

    return {
        public: () => getPublic(),
        private: () => (token ? getPrivate() : getPublic())
    };
};

export type StorefrontApiConfig = Awaited<ReturnType<typeof ShopifyApiConfig>>;

export const ShopifyApolloApiClient = async ({
    shop,
    locale = Locale.default,
    apiConfig,
    noCache
}: ShopifyApiOptions) => {
    // TODO: Support public headers too.
    const config = apiConfig || (await ShopifyApiConfig({ shop })).private();

    return ApiBuilder({
        shop,
        locale,
        api: createApolloClient(config)
    });
};
export type ShopifyApiClient = Awaited<ReturnType<typeof ShopifyApolloApiClient>>;
