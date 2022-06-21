import 'isomorphic-unfetch';

import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

export const shopify = new ApolloClient({
    ssrMode: true,
    link: new HttpLink({
        uri: `https://${
            process.env.STORE || 'candy-by-sweden.myshopify.com'
        }/api/2022-01/graphql.json`,
        headers: {
            'X-Shopify-Storefront-Access-Token':
                process.env.STOREFRONT_ACCESS_TOKEN ||
                '234f356a7e866a3fecfa3d2f0c9a7c85'
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
        uri: `https://${
            process.env.STORE || 'candy-by-sweden.myshopify.com'
        }/api/2022-07/graphql.json`,
        headers: {
            'X-Shopify-Storefront-Access-Token':
                process.env.STOREFRONT_ACCESS_TOKEN ||
                '234f356a7e866a3fecfa3d2f0c9a7c85'
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
