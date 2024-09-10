import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';

import { shopifyContextTransform } from '@/utils/abstract-api';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

export type ApiConfig = {
    uri: string;
    headers: Record<string, string>;
};

export const createApolloClient = ({ uri, headers }: ApiConfig, shop: OnlineShop) => {
    return new ApolloClient({
        name: 'nordcom-headless-client',
        queryDeduplication: true,
        ssrMode: false,
        link: new HttpLink({
            uri,
            headers,
            fetchOptions: {
                next: {
                    revalidate: 28_800,
                    tags: ['shopify', `shopify.${shop.id}`, shop.domain]
                }
            }
        }),
        cache: new InMemoryCache({
            canonizeResults: true,
            addTypename: true,

            // TODO: Validate that this is correct.
            typePolicies: {
                Product: {
                    fields: {
                        productType: {
                            read(value) {
                                if (!value || value.length <= 0) {
                                    return null;
                                }

                                return value.trim();
                            }
                        },
                        descriptionHtml: {
                            read(value) {
                                if (!value || value.length <= 0) {
                                    return '';
                                }

                                // Clean up the HTML.
                                return value
                                    .replaceAll('\n', '')
                                    .replaceAll('<meta charset="UTF-8">', '')
                                    .replaceAll(/data-[a-zA-Z0-9-]+="[^"]+"/g, '') // Remove all data-attributes.
                                    .trim();
                            }
                        },
                        trackingParameters: {
                            read(value) {
                                return value || '';
                            }
                        }
                    }
                },
                Query: {
                    fields: {
                        localization: {
                            merge(existing, incoming, { mergeObjects }) {
                                return mergeObjects(existing, incoming);
                            }
                        }
                    }
                }
            }
        }),
        documentTransform: shopifyContextTransform,
        defaultOptions: {
            watchQuery: {
                fetchPolicy: 'cache-and-network',
                errorPolicy: 'all'
            },
            query: {
                fetchPolicy: 'cache-first',
                errorPolicy: 'all'
            },
            mutate: {
                errorPolicy: 'all'
            }
        }
    });
};
