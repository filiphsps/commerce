import 'server-only';

import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';
import { PRODUCT_FRAGMENT_MINIMAL } from '@/api/shopify/product-fragments';

export const COLLECTION_QUERY = graphql(
    `
    query collection(
        $handle: String!
        $first: Int
        $last: Int
        $sorting: ProductCollectionSortKeys
        $before: String
        $after: String
    ) {
        collection(handle: $handle) {
            id
            handle
            updatedAt
            title
            description
            descriptionHtml
            image {
                id
                altText
                url(transform: { preferredContentType: WEBP })
                height
                width
                thumbhash
            }
            seo {
                title
                description
            }
            products(first: $first, last: $last, sortKey: $sorting, before: $before, after: $after) {
                edges {
                    node {
                        ...ProductMinimal
                    }
                }
                pageInfo {
                    startCursor
                    endCursor
                    hasNextPage
                    hasPreviousPage
                }
            }
            keywords: metafield(namespace: "store", key: "keywords") {
                value
            }
            isBrand: metafield(namespace: "store", key: "is_brand") {
                value
            }
            shortDescription: metafield(namespace: "store", key: "short_description") {
                value
            }
        }
    }
`,
    [PRODUCT_FRAGMENT_MINIMAL],
);

export const COLLECTION_PAGINATION_COUNT_QUERY = graphql(`
    query collectionPaginationCount(
        $handle: String!
        $first: Int
        $sorting: ProductCollectionSortKeys
        $before: String
        $after: String
    ) {
        collection(handle: $handle) {
            id
            handle
            products(first: $first, sortKey: $sorting, before: $before, after: $after) {
                edges {
                    cursor
                    node {
                        id
                    }
                }
                pageInfo {
                    hasNextPage
                }
            }
        }
    }
`);

export const COLLECTIONS_QUERY = graphql(`
    query collections {
        collections(first: 250) {
            edges {
                node {
                    id
                    handle
                    products(first: 1) {
                        edges {
                            node {
                                id
                            }
                        }
                    }
                }
            }
        }
    }
`);

export const COLLECTIONS_PAGINATION_QUERY = graphql(`
    query collectionsPagination(
        $first: Int
        $last: Int
        $sorting: CollectionSortKeys
        $before: String
        $after: String
    ) {
        collections(first: $first, last: $last, sortKey: $sorting, before: $before, after: $after) {
            edges {
                cursor
                node {
                    id
                    handle
                    updatedAt
                    title
                    description
                    descriptionHtml
                    image {
                        id
                        altText
                        url(transform: { preferredContentType: WEBP })
                        height
                        width
                        thumbhash
                    }
                    seo {
                        title
                        description
                    }
                }
            }
            pageInfo {
                startCursor
                endCursor
                hasNextPage
                hasPreviousPage
            }
        }
    }
`);
