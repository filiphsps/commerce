import 'server-only';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import type { OnlineShop } from '@nordcom/commerce-db';
import { inContextTransform } from '@nordcom/commerce-shopify-graphql';
import { tenantRootTags } from '@/cache';

export type ApiConfig = {
    uri: string;
    headers: Record<string, string>;
};

/**
 * Creates a new Apollo Client instance configured for the Shopify Storefront API.
 *
 * @param config - HTTP endpoint and auth headers for the Storefront API.
 * @param shop - Tenant record used to set the Next.js revalidation cache tags.
 * @returns A configured `ApolloClient` instance with caching and error policies set.
 */
export const createApolloClient = ({ uri, headers }: ApiConfig, shop: OnlineShop) => {
    return new ApolloClient({
        clientAwareness: {
            name: 'nordcom-headless-client',
        },
        queryDeduplication: true,
        ssrMode: false,
        link: new HttpLink({
            uri,
            headers,
            fetchOptions: {
                next: {
                    revalidate: 28_800,
                    tags: tenantRootTags(shop),
                },
            },
        }),
        // No `addTypename` — Apollo v4 always injects __typename via a built-in DocumentTransform.
        cache: new InMemoryCache({
            typePolicies: {
                Product: {
                    fields: {
                        productType: {
                            read(value) {
                                if (!value || value.length <= 0) {
                                    return null;
                                }

                                return value.trim();
                            },
                        },
                        trackingParameters: {
                            read(value) {
                                return value || '';
                            },
                        },
                    },
                },
                // `ProductPriceRange` and `MoneyV2` are embedded value types with no `id`, so the cache
                // can't normalize them. A partial selection (e.g. a rail querying only
                // `minVariantPrice.amount`) landing on the same `Product.priceRange`/`compareAtPriceRange`
                // as a fuller selection would otherwise warn and discard the cached object. `merge: true`
                // merges incoming fields over existing ones; both types need it so the nested `MoneyV2`
                // merges field-by-field too, preserving a previously-cached `currencyCode` the partial
                // selection omits.
                ProductPriceRange: {
                    merge: true,
                },
                MoneyV2: {
                    merge: true,
                },
                Query: {
                    fields: {
                        localization: {
                            merge(existing, incoming, { mergeObjects }) {
                                return mergeObjects(existing, incoming);
                            },
                        },
                    },
                },
            },
        }),
        documentTransform: inContextTransform,
        defaultOptions: {
            watchQuery: {
                fetchPolicy: 'cache-and-network',
                errorPolicy: 'all',
            },
            query: {
                fetchPolicy: 'cache-first',
                errorPolicy: 'all',
            },
            mutate: {
                errorPolicy: 'all',
            },
        },
    });
};
