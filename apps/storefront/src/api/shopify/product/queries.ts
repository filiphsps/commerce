import 'server-only';

export const PRODUCT_FRAGMENT = /* GraphQL */ `
    id
    handle
    availableForSale
    encodedVariantExistence
    encodedVariantAvailability
    createdAt
    updatedAt
    publishedAt
    isGiftCard
    requiresSellingPlan
    title
    description
    descriptionHtml
    vendor
    productType
    tags
    trackingParameters
    totalInventory
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
    options(first: 250) {
        id
        name
        # \`values\` (legacy string array) is retained alongside \`optionValues\`
        # because internal helpers (filterRealOptions / hasProductOptions in
        # @/utils/has-product-options) still consume either shape — newer
        # Shopify-aware callers go through \`optionValues\` via
        # hydrogen-react's \`getProductOptions\`.
        values
        # Modern option-value selection model used by hydrogen-react's
        # \`getProductOptions\`. Without these subfields the helper logs
        # "product.options.optionValues is missing" at runtime.
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
    # Required by hydrogen-react's \`getProductOptions\` to resolve the
    # currently-selected variant and the variants reachable in a single
    # option change. Both fields project the same minimal variant shape.
    selectedOrFirstAvailableVariant(ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        id
        title
        availableForSale
        currentlyNotInStock
        quantityAvailable
        requiresShipping
        product {
            handle
        }
        selectedOptions {
            name
            value
        }
        price {
            amount
            currencyCode
        }
        compareAtPrice {
            amount
            currencyCode
        }
        unitPrice {
            amount
            currencyCode
        }
        unitPriceMeasurement {
            measuredType
            quantityUnit
            quantityValue
            referenceUnit
            referenceValue
        }
        image {
            id
            altText
            url(transform: { preferredContentType: WEBP })
            height
            width
            thumbhash
        }
    }
    adjacentVariants {
        id
        title
        availableForSale
        currentlyNotInStock
        quantityAvailable
        requiresShipping
        product {
            handle
        }
        selectedOptions {
            name
            value
        }
        price {
            amount
            currencyCode
        }
        compareAtPrice {
            amount
            currencyCode
        }
        image {
            id
            altText
            url(transform: { preferredContentType: WEBP })
            height
            width
            thumbhash
        }
    }
    variants(first: 250) {
        edges {
            node {
                id
                sku
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
                unitPrice {
                    amount
                    currencyCode
                }
                unitPriceMeasurement {
                    measuredType
                    quantityUnit
                    quantityValue
                    referenceUnit
                    referenceValue
                }
                availableForSale
                currentlyNotInStock
                quantityAvailable
                requiresShipping
                taxable
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

                quantityBreaks: metafield(namespace: "nordcom-commerce", key: "quantity_breaks") {
                    id
                    namespace
                    reference {
                        ... on Metaobject {
                            handle
                            steps: field(key: "steps") {
                                references(first: 25) {
                                    edges {
                                        node {
                                            ... on Metaobject {
                                                minimumQuantity: field(key: "minimum_quantity") {
                                                    value
                                                }
                                                value: field(key: "value") {
                                                    value
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
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
    images(first: 250) {
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

    originalName: metafield(namespace: "store", key: "original-name") {
        id
        namespace
        value
        type
    }

    nutritionalContent: metafield(namespace: "store", key: "nutritional_content") {
        id
        namespace
        value
        type
    }

    ingredients: metafield(namespace: "store", key: "ingredients") {
        id
        namespace
        value
        type
    }
    flavors: metafield(namespace: "store", key: "flavors") {
        id
        namespace
        value
        type
    }

    allergen: metafield(namespace: "shopify", key: "allergen-information") {
        id
        namespace
        value
        type
    }
    rating: metafield(namespace: "reviews", key: "rating") {
        id
        namespace
        value
        type
    }
    ratingCount: metafield(namespace: "reviews", key: "rating_count") {
        id
        namespace
        value
        type
    }
`;

// Lean projection for product *card* surfaces. The gql.tada side has a related
// lean fragment (`PRODUCT_FRAGMENT_MINIMAL` in ../product-fragments.ts) that
// backs the collection/search/recommendation cards; that one is a SUPERSET of
// this twin (it still carries selected/adjacent-variant projections + price
// ranges its resolver-based card never reads — leaning it out is a follow-up).
// This Apollo-string twin exists because `ProductsPaginationApi` (the /products
// grid + the products sitemap) builds its query with Apollo `gql` string
// interpolation, which cannot embed a gql.tada document. It drops everything the
// card never reads — prose (description/seo), price ranges (the card prices off
// the seed variant), the full image gallery, adjacent/selected-variant
// projections, per-variant metafields (quantityBreaks), and all product
// metafields.
//
// `variants(first: 250)` matches the PDP fragment's cap: the card picker
// resolves an option combo by scanning the full variant list, so a card must be
// able to resolve any combo the PDP can — capping below 250 would re-introduce
// the partial-blanking it fixes. The node is slim (no metafields/gallery), so
// the cost stays low and most products have few variants. `updatedAt` is
// retained solely because the products sitemap, which shares
// `ProductsPaginationApi`, reads it for `lastmod`.
export const PRODUCT_CARD_FRAGMENT = /* GraphQL */ `
    id
    handle
    updatedAt
    availableForSale
    isGiftCard
    requiresSellingPlan
    title
    vendor
    productType
    tags
    trackingParameters
    options(first: 3) {
        id
        name
        values
        optionValues {
            id
            name
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
    images(first: 2) {
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
