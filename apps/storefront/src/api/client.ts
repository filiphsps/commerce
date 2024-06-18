import 'server-only';

import { shopifyContextTransform } from '@/utils/abstract-api';
import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { registerApolloClient } from '@apollo/experimental-nextjs-app-support';

export type ApiConfig = {
    uri: string;
    headers: Record<string, string>;
};

const ssr = ({ uri, headers }: ApiConfig) =>
    registerApolloClient(
        () =>
            new ApolloClient({
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
                        errorPolicy: 'ignore'
                    },
                    query: {
                        fetchPolicy: 'cache-first',
                        errorPolicy: 'all'
                    },
                    mutate: {
                        errorPolicy: 'all'
                    }
                }
            })
    );

export const setupApollo = (apiConfig: ApiConfig) => {
    return ssr(apiConfig);
};
