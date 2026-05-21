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
