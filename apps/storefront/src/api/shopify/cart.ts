import { PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS } from '@/api/shopify/product';

export const CartFragment = /* GraphQL */ `
    fragment CartFragment on Cart {
        id
        checkoutUrl
        totalQuantity
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
                    }
                    merchandise {
                        ... on ProductVariant {
                            id
                            availableForSale
                            compareAtPrice {
                                ...MoneyFragment
                            }
                            price {
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
            totalDutyAmount {
                ...MoneyFragment
            }
            totalTaxAmount {
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
    }
    fragment ProductFragment on Product {
        ${PRODUCT_FRAGMENT_MINIMAL_NO_VARIANTS}
    }
`;
