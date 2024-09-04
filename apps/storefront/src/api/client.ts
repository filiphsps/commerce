import 'server-only';

import { shopifyContextTransform } from '@/utils/abstract-api';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { OnlineShop } from '@nordcom/commerce-db';

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
            addTypename: true
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
