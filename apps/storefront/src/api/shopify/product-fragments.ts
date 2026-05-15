/**
 * Standalone GraphQL fragment strings for products.
 *
 * Lives in its own file with zero non-string imports so it can be pulled into
 * client bundles (cart.ts → providers-registry.tsx) without dragging the
 * server-only cache instance (which imports `next/cache`) along. Trying to
 * re-export these from `product.ts` puts the entire API module — including
 * `cache` and Apollo — onto the import graph webpack walks for client
 * components, and the build then fails with:
 *
 *   You're importing a module that depends on "revalidateTag".
 *
 * Keep this file as pure string constants. No imports from `@/`, no
 * Apollo, no cache.
 */

export const PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS = /* GraphQL */ `
    id
    handle
    availableForSale
    encodedVariantExistence
    encodedVariantAvailability
    createdAt
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
`;

export const PRODUCT_FRAGMENT_MINIMAL = /* GraphQL */ `
    ${PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS}

    options(first: 3) {
        id
        name
        values
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
                weight
                weightUnit
                image {
                    id
                    altText
                    url(transform: { preferredContentType: WEBP })
                    height
                    width
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
    }
    images(first: 5) {
        edges {
            node {
                id
                altText
                url(transform: { preferredContentType: WEBP })
                height
                width
            }
        }
    }
`;
