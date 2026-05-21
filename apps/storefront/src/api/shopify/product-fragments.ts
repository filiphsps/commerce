/**
 * Typed product fragments used across the storefront.
 *
 * These are gql.tada fragments (typed `TypedDocumentNode`s with no runtime
 * deps beyond the `graphql()` helper). Imported by both server-side query
 * builders and the client cart fragment — keeping the module free of
 * `@/cache` etc. so it can land in the client bundle.
 */

import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';

export const PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS = graphql(`
    fragment ProductMinimalNoVariants on Product {
        id
        handle
        availableForSale
        encodedVariantExistence
        encodedVariantAvailability
        createdAt
        publishedAt
        isGiftCard
        requiresSellingPlan
        title
        description
        vendor
        productType
        tags
        trackingParameters
        seo {
            title
            description
        }
        priceRange {
            maxVariantPrice {
                amount
                currencyCode
            }
            minVariantPrice {
                amount
                currencyCode
            }
        }
        compareAtPriceRange {
            maxVariantPrice {
                amount
                currencyCode
            }
            minVariantPrice {
                amount
                currencyCode
            }
        }
    }
`);

export const PRODUCT_FRAGMENT_MINIMAL = graphql(
    `
    fragment ProductMinimal on Product {
        ...ProductMinimalNoVariants
        options(first: 3) {
            id
            name
            values
            optionValues {
                id
                name
                firstSelectableVariant {
                    id
                    product {
                        handle
                    }
                    selectedOptions {
                        name
                        value
                    }
                }
                swatch {
                    color
                    image {
                        previewImage {
                            url(transform: { preferredContentType: WEBP })
                            altText
                            width
                            height
                        }
                    }
                }
            }
        }
        selectedOrFirstAvailableVariant(ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
            id
            availableForSale
            product {
                handle
            }
            selectedOptions {
                name
                value
            }
        }
        adjacentVariants {
            id
            availableForSale
            product {
                handle
            }
            selectedOptions {
                name
                value
            }
        }
        variants(first: 3) {
            edges {
                node {
                    id
                    title
                    barcode
                    price {
                        amount
                        currencyCode
                    }
                    compareAtPrice {
                        amount
                        currencyCode
                    }
                    availableForSale
                    currentlyNotInStock
                    quantityAvailable
                    requiresShipping
                    weight
                    weightUnit
                    image {
                        id
                        altText
                        url(transform: { preferredContentType: WEBP })
                        height
                        width
                        thumbhash
                    }
                    selectedOptions {
                        name
                        value
                    }
                }
            }
        }
        featuredImage {
            id
            altText
            url(transform: { preferredContentType: WEBP })
            height
            width
            thumbhash
        }
        images(first: 5) {
            edges {
                node {
                    id
                    altText
                    url(transform: { preferredContentType: WEBP })
                    height
                    width
                    thumbhash
                }
            }
        }
    }
`,
    [PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS],
);
