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
`;

export const PRODUCT_FRAGMENT_MINIMAL = /* GraphQL */ `
    ${PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS}

    options(first: 3) {
        id
        name
        # Legacy string-value array, retained for non-hydrogen-react consumers
        # (see @/utils/has-product-options.filterRealOptions).
        values
        # Modern option-value selection model required by hydrogen-react's
        # \`getProductOptions\` — without it the helper logs
        # "product.options.optionValues is missing" at runtime on product cards.
        optionValues {
            id
            name
            firstSelectableVariant {
                id
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
    # Required by hydrogen-react's \`getProductOptions\`. Kept minimal here so
    # product-card payloads stay small — full pricing/imagery for these
    # variants lives in the detail-page fragment.
    selectedOrFirstAvailableVariant(ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        id
        availableForSale
        selectedOptions {
            name
            value
        }
    }
    adjacentVariants {
        id
        availableForSale
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
`;
