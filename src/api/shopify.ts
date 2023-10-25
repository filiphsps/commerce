import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core';

import { BuildConfig } from '@/utils/build-config';
import { createStorefrontClient } from '@shopify/hydrogen-react';

export const shopifyClient = createStorefrontClient({
    publicStorefrontToken: BuildConfig.shopify.token,
    storeDomain: `https://${BuildConfig.shopify.checkout_domain}`,
    storefrontApiVersion: BuildConfig.shopify.api
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
