import 'server-only';

import { shopifyContextTransform } from '@/utils/abstract-api';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

// TODO: Deal with registration of ApolloClient to properly support RSC.
// import { registerApolloClient } from '@apollo/experimental-nextjs-app-support';

export type ApiConfig = {
    uri: string;
    headers: Record<string, string>;
};

export const createApolloClient = ({ uri, headers }: ApiConfig) => {
    return new ApolloClient({
        name: 'nordcom-headless-client',
        queryDeduplication: false,
        ssrMode: true,
        link: new HttpLink({
            uri,
            headers,
            fetchOptions: {
                cache: 'force-cache',
                next: {
                    revalidate: 60 * 60 * 8, // 8 hours.
                    tags: ['shopify']
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
