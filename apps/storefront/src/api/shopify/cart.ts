// Import from the fragments-only module — importing from `product.ts` here
// would pull `@/cache` (and therefore `next/cache`) into the client bundle
// via `providers-registry.tsx`, which webpack rejects at build time.
import { PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS } from '@/api/shopify/product-fragments';

export const CartFragment = /* GraphQL */ `
    fragment CartFragment on Cart {
        id
        checkoutUrl
        totalQuantity
        createdAt
        updatedAt
        buyerIdentity {
            countryCode
            customer {
                id
                email
                firstName
                lastName
                displayName
            }
            email
            phone
        }
        lines(first: $numCartLines) {
            edges {
                node {
                    id
                    quantity
                    attributes {
                        key
                        value
                    }
                    cost {
                        amountPerQuantity {
                            ...MoneyFragment
                        }
                        subtotalAmount {
                            ...MoneyFragment
                        }
                        totalAmount {
                            ...MoneyFragment
                        }
                        compareAtAmountPerQuantity {
                            ...MoneyFragment
                        }
                    }
                    discountAllocations {
                        discountedAmount {
                            ...MoneyFragment
                        }
                        ... on CartAutomaticDiscountAllocation {
                            title
                            discountedAmount {
                                amount
                                currencyCode
                            }
                        }
                        ... on CartCodeDiscountAllocation {
                            code
                            discountedAmount {
                                amount
                                currencyCode
                            }
                        }
                    }
                    merchandise {
                        ... on ProductVariant {
                            id
                            availableForSale
                            barcode
                            sku
                            compareAtPrice {
                                ...MoneyFragment
                            }
                            price {
                                ...MoneyFragment
                            }
                            unitPrice {
                                ...MoneyFragment
                            }
                            requiresShipping
                            title
                            image {
                                ...ImageFragment
                            }
                            product {
                                ...ProductFragment
                            }
                            selectedOptions {
                                name
                                value
                            }
                        }
                    }
                }
            }
        }
        cost {
            subtotalAmount {
                ...MoneyFragment
            }
            totalAmount {
                ...MoneyFragment
            }
            checkoutChargeAmount {
                ...MoneyFragment
            }
        }
        note
        attributes {
            key
            value
        }
        discountCodes {
            code
            applicable
        }
    }

    fragment MoneyFragment on MoneyV2 {
        currencyCode
        amount
    }
    fragment ImageFragment on Image {
        id
        url
        altText
        width
        height
        thumbhash
    }
    fragment ProductFragment on Product {
        ${PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS}
    }
`;
