import 'server-only';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import type { OnlineShop } from '@nordcom/commerce-db';
import { inContextTransform } from '@nordcom/commerce-shopify-graphql';

export type ApiConfig = {
    uri: string;
    headers: Record<string, string>;
};

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
                    tags: ['shopify', `shopify.${shop.id}`, shop.domain],
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
