import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client/core';

import { Config } from '@/utils/Config';
import { createStorefrontClient } from '@shopify/hydrogen-react';

export const shopifyClient = createStorefrontClient({
    publicStorefrontToken: Config.shopify.token,
    storeDomain: Config.shopify.checkout_domain,
    storefrontApiVersion: '2023-10'
});

export const storefrontClient = new ApolloClient({
    ssrMode: true,
    connectToDevTools: true,
    link: new HttpLink({
        uri: (() => {
            let url = shopifyClient.getStorefrontApiUrl();
            if (!url.startsWith('http')) url = `https://${url}`;

            return url;
        })(),
        headers: shopifyClient.getPublicTokenHeaders()
    }),
    cache: new InMemoryCache({
        canonizeResults: true
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
            fetchPolicy: 'no-cache',
            errorPolicy: 'all'
        }
    }
});
