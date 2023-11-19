import 'server-only';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core';
import { registerApolloClient } from '@apollo/experimental-nextjs-app-support/rsc';

export type ApiConfig = {
    uri: string;
    headers: Record<string, string>;
};

export const setupApi = ({ uri, headers }: ApiConfig) =>
    registerApolloClient(
        () =>
            new ApolloClient({
                ssrMode: true,
                link: new HttpLink({
                    uri,
                    headers
                }),
                cache: new InMemoryCache({
                    canonizeResults: true,
                    addTypename: false
                }),
                defaultOptions: {
                    watchQuery: {
                        fetchPolicy: 'no-cache',
                        errorPolicy: 'ignore'
                    },
                    query: {
                        fetchPolicy: 'force-cache' as any,
                        errorPolicy: 'all'
                    },
                    mutate: {
                        errorPolicy: 'all'
                    }
                }
            })
    );
