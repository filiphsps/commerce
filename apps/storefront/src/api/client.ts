import { shopifyContextTransform } from '@/utils/abstract-api';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

export type ApiConfig = {
    uri: string;
    headers: Record<string, string>;
};

export const createApolloClient = ({ uri, headers }: ApiConfig) => {
    return new ApolloClient({
        name: 'nordcom-headless-client',
        queryDeduplication: false,
        ssrMode: false,
        link: new HttpLink({
            uri,
            headers: {
                ...headers
                //'Content-Type': 'application/graphql'
            },
            fetchOptions: {
                next: {
                    revalidate: 3600,
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
