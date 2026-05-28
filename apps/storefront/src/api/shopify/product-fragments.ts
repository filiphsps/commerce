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
        # The card pickers (inline/float/sheet) resolve a chosen option combo by
        # scanning this variant list — resolver.findVariant matches a full
        # selection and deriveAvailability cross-filters it. Every purchasable
        # variant must therefore be present: \`first: 3\` truncated the set and
        # left Add-to-bag disabled (and extra option values struck through) for
        # any combo past the third variant. Matched to the PDP fragment's
        # \`first: 250\` so a card never fails to resolve a combo the PDP can; the
        # cost stays low because this variant node is slim (no per-variant
        # metafields, no gallery) and most products have few variants.
        variants(first: 250) {
            edges {
                node {
                    id
                    title
                    sku
                    price {
                        amount
                        currencyCode
                    }
                    compareAtPrice {
                        amount
                        currencyCode
                    }
                    availableForSale
                    quantityAvailable
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
