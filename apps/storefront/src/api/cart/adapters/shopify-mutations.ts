import { graphql } from '@nordcom/commerce-shopify-graphql/graphql';

const CART_FIELDS = graphql(`
    fragment CartFields on Cart {
        id
        checkoutUrl
        totalQuantity
        updatedAt
        note
        attributes {
            key
            value
        }
        buyerIdentity {
            countryCode
            email
            phone
            customer {
                id
                email
            }
        }
        discountCodes {
            code
            applicable
        }
        appliedGiftCards {
            id
            lastCharacters
            amountUsed {
                amount
                currencyCode
            }
            balance {
                amount
                currencyCode
            }
            presentmentAmountUsed {
                amount
                currencyCode
            }
        }
        cost {
            subtotalAmount {
                amount
                currencyCode
            }
            totalAmount {
                amount
                currencyCode
            }
        }
        lines(first: 100) {
            edges {
                node {
                    id
                    quantity
                    attributes {
                        key
                        value
                    }
                    cost {
                        subtotalAmount {
                            amount
                            currencyCode
                        }
                        totalAmount {
                            amount
                            currencyCode
                        }
                        amountPerQuantity {
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
                        ... on CartAutomaticDiscountAllocation {
                            title
                        }
                        ... on CartCodeDiscountAllocation {
                            code
                        }
                    }
                    merchandise {
                        ... on ProductVariant {
                            id
                            title
                            sku
                            availableForSale
                            quantityAvailable
                            price {
                                amount
                                currencyCode
                            }
                            compareAtPrice {
                                amount
                                currencyCode
                            }
                            selectedOptions {
                                name
                                value
                            }
                            image {
                                url
                                altText
                                width
                                height
                            }
                            product {
                                id
                                handle
                                title
                                vendor
                                productType
                            }
                        }
                    }
                }
            }
        }
    }
`);

export const CART_QUERY = graphql(
    `
        query CartById($cartId: ID!) {
            cart(id: $cartId) {
                ...CartFields
            }
        }
    `,
    [CART_FIELDS],
);

export const CART_CREATE_MUTATION = graphql(
    `
        mutation CartCreate($input: CartInput) {
            cartCreate(input: $input) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,
    [CART_FIELDS],
);

export const CART_LINES_ADD_MUTATION = graphql(
    `
        mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,
    [CART_FIELDS],
);

export const CART_LINES_UPDATE_MUTATION = graphql(
    `
        mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
            cartLinesUpdate(cartId: $cartId, lines: $lines) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,
    [CART_FIELDS],
);

export const CART_LINES_REMOVE_MUTATION = graphql(
    `
        mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
            cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,
    [CART_FIELDS],
);

export const CART_DISCOUNT_CODES_UPDATE_MUTATION = graphql(
    `
        mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]!) {
            cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,
    [CART_FIELDS],
);

export const CART_GIFT_CARD_CODES_UPDATE_MUTATION = graphql(
    `
        mutation CartGiftCardCodesUpdate($cartId: ID!, $giftCardCodes: [String!]!) {
            cartGiftCardCodesUpdate(cartId: $cartId, giftCardCodes: $giftCardCodes) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,
    [CART_FIELDS],
);

export const CART_GIFT_CARD_CODES_REMOVE_MUTATION = graphql(
    `
        mutation CartGiftCardCodesRemove($cartId: ID!, $appliedGiftCardIds: [ID!]!) {
            cartGiftCardCodesRemove(cartId: $cartId, appliedGiftCardIds: $appliedGiftCardIds) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,
    [CART_FIELDS],
);

export const CART_BUYER_IDENTITY_UPDATE_MUTATION = graphql(
    `
        mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
            cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,
    [CART_FIELDS],
);

export const CART_NOTE_UPDATE_MUTATION = graphql(
    `
        mutation CartNoteUpdate($cartId: ID!, $note: String!) {
            cartNoteUpdate(cartId: $cartId, note: $note) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,
    [CART_FIELDS],
);

export const CART_ATTRIBUTES_UPDATE_MUTATION = graphql(
    `
        mutation CartAttributesUpdate($cartId: ID!, $attributes: [AttributeInput!]!) {
            cartAttributesUpdate(cartId: $cartId, attributes: $attributes) {
                cart {
                    ...CartFields
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `,
    [CART_FIELDS],
);
