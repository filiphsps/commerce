import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

import { Config } from '../util/Config';

export const shopify = new ApolloClient({
    ssrMode: true,
    link: new HttpLink({
        uri: `https://${Config.shopify.domain}/api/2022-01/graphql.json`,
        headers: {
            'X-Shopify-Storefront-Access-Token':
                Config.shopify.token || '234f356a7e866a3fecfa3d2f0c9a7c85'
        }
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
            errorPolicy: 'all'
        }
    }
});

export const newShopify = new ApolloClient({
    ssrMode: true,
    link: new HttpLink({
        uri: `https://${Config.shopify.domain}/api/2022-07/graphql.json`,
        headers: {
            'X-Shopify-Storefront-Access-Token':
                Config.shopify.token || '234f356a7e866a3fecfa3d2f0c9a7c85'
        }
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
            errorPolicy: 'all'
        }
    }
});
