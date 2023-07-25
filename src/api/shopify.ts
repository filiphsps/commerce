import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

import { createStorefrontClient } from '@shopify/hydrogen-react';
import { Config } from '../util/Config';

export const shopifyClient = createStorefrontClient({
    publicStorefrontToken: Config.shopify.token,
    storeDomain: `https://${Config.domain.replace('www', 'checkout')}`,
    storefrontApiVersion: Config.shopify.api
});

export const storefrontClient = new ApolloClient({
    ssrMode: true,
    link: new HttpLink({
        uri: shopifyClient.getStorefrontApiUrl(),
        headers: shopifyClient.getPublicTokenHeaders()
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
            fetchPolicy: 'no-cache',
            errorPolicy: 'all'
        },
        mutate: {
            errorPolicy: 'all'
        }
    }
});
