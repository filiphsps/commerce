'use client';

import { ApolloLink, HttpLink } from '@apollo/client';
import {
    ApolloNextAppProvider,
    NextSSRApolloClient,
    NextSSRInMemoryCache,
    SSRMultipartLink
} from '@apollo/experimental-nextjs-app-support/ssr';

import type { ApiConfig } from '@/api/client';
import type { ReactNode } from 'react';

export const createClientMaker =
    ({ apiConfig }: { apiConfig: ApiConfig }) =>
    () => {
        const httpLink = new HttpLink({
            uri: apiConfig.uri,
            headers: apiConfig.headers,
            // you can disable result caching here if you want to
            // (this does not work if you are rendering your page with `export const dynamic = "force-static"`)
            fetchOptions: { cache: 'force-cache', next: { revalidate: 28_800 } }
            // you can override the default `fetchOptions` on a per query basis
            // via the `context` property on the options passed as a second argument
            // to an Apollo Client data fetching hook, e.g.:
            // const { data } = useSuspenseQuery(MY_QUERY, { context: { fetchOptions: { cache: "force-cache" }}});
        });

        const isBrowser = typeof window === 'undefined';
        // TODO: Validate `apiConfig` to make sure it doesn't include private token on client.

        return new NextSSRApolloClient({
            // use the `NextSSRInMemoryCache`, not the normal `InMemoryCache`
            cache: new NextSSRInMemoryCache(),

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
            },
            link:
                (isBrowser &&
                    ApolloLink.from([
                        // in a SSR environment, if you use multipart features like
                        // @defer, you need to decide how to handle these.
                        // This strips all interfaces with a `@defer` directive from your queries.
                        new SSRMultipartLink({
                            stripDefer: true
                        }),
                        httpLink
                    ])) ||
                httpLink
        });
    };

export default function ApiProvider({ children, apiConfig }: { children: ReactNode; apiConfig: ApiConfig }) {
    return <ApolloNextAppProvider makeClient={createClientMaker({ apiConfig })}>{children}</ApolloNextAppProvider>;
}
