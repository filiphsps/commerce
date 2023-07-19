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
                            amount
                            currencyCode
                        }
                        compareAtAmountPerQuantity {
                            amount
                            currencyCode
                        }
                    }
                    discountAllocations {
                        discountedAmount {
                            amount
                            currencyCode
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
                                handle
                                title
                                id
                                vendor
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
        discountAllocations {
            ... on CartAutomaticDiscountAllocation {
                title
                discountedAmount {
                    currencyCode
                    amount
                }
            }
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
`;
