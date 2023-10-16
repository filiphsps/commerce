import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core';

import { Config } from '@/utils/Config';
import { createStorefrontClient } from '@shopify/hydrogen-react';

export const shopifyClient = createStorefrontClient({
    publicStorefrontToken: Config.shopify.token,
    storeDomain: `https://${Config.shopify.checkout_domain}`,
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
