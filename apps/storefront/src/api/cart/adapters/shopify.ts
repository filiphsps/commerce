import { CartNotFoundError, CartProviderError, CartUserError } from '@nordcom/commerce-errors';
import { ShopifyApolloApiClient } from '@/api/shopify';
import type { BuyerIdentity, Cart, CartProviderAdapter } from '../types';
import {
    CART_ATTRIBUTES_UPDATE_MUTATION,
    CART_BUYER_IDENTITY_UPDATE_MUTATION,
    CART_CREATE_MUTATION,
    CART_DISCOUNT_CODES_UPDATE_MUTATION,
    CART_GIFT_CARD_CODES_REMOVE_MUTATION,
    CART_GIFT_CARD_CODES_UPDATE_MUTATION,
    CART_LINES_ADD_MUTATION,
    CART_LINES_REMOVE_MUTATION,
    CART_LINES_UPDATE_MUTATION,
    CART_NOTE_UPDATE_MUTATION,
    CART_QUERY,
} from './shopify-mutations';
import { normalize } from './shopify-normalize';

type MutationResultEnvelope = {
    cart: unknown;
    userErrors: Array<{ field?: string; message: string }>;
};

function unwrapMutation(envelope: MutationResultEnvelope | null | undefined, mutationName: string): Cart {
    if (!envelope) throw new CartProviderError(`Shopify ${mutationName} returned no envelope`);
    if (envelope.userErrors && envelope.userErrors.length > 0) {
        throw new CartUserError(envelope.userErrors);
    }
    const cart = normalize(envelope.cart);
    if (!cart) throw new CartProviderError(`Shopify ${mutationName} returned no cart`);
    return cart;
}

const TYPED_CART_ERROR_NAMES = new Set(['CartUserError', 'CartNotFoundError', 'CartProviderError']);

function wrapTransportError(error: unknown, opName: string): CartProviderError {
    // `instanceof` is unreliable for @nordcom/commerce-errors subclasses because
    // the `Error<T>` base resets the prototype to `Error.prototype`. Match by
    // `.name` instead so already-typed errors propagate without being re-wrapped.
    const name = (error as Error)?.name;
    if (name && TYPED_CART_ERROR_NAMES.has(name)) {
        throw error;
    }
    return new CartProviderError(`Shopify cart ${opName} failed: ${(error as Error)?.message ?? String(error)}`, error);
}

function serializeBuyerIdentity(b: BuyerIdentity): Record<string, unknown> {
    return {
        customerAccessToken: b.customerAccessToken,
        email: b.email,
        phone: b.phone,
        countryCode: b.countryCode,
    };
}

const shopifyCartAdapter: CartProviderAdapter = {
    type: 'shopify',

    async getCart({ cartId, shop, locale }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                query: (q: unknown, v: Record<string, unknown>) => Promise<{ data: { cart: unknown } | null }>;
            };
            const { data } = await api.query(CART_QUERY, { cartId });
            const raw = data?.cart;
            if (!raw) throw new CartNotFoundError(cartId);
            return normalize(raw);
        } catch (error) {
            throw wrapTransportError(error, 'getCart');
        }
    },

    async createCart({ shop, locale, lines, buyerIdentity }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
            };
            const input: Record<string, unknown> = {};
            if (lines && lines.length > 0) {
                input.lines = lines.map((l) => ({
                    merchandiseId: l.variantId,
                    quantity: l.quantity,
                    attributes: l.attributes,
                }));
            }
            if (buyerIdentity) input.buyerIdentity = serializeBuyerIdentity(buyerIdentity);
            const { data } = await api.mutate(CART_CREATE_MUTATION, { input });
            return unwrapMutation(data?.cartCreate as MutationResultEnvelope | null | undefined, 'cartCreate');
        } catch (error) {
            throw wrapTransportError(error, 'createCart');
        }
    },

    async addLines({ cartId, shop, locale, lines }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
            };
            const { data } = await api.mutate(CART_LINES_ADD_MUTATION, {
                cartId,
                lines: lines.map((l) => ({
                    merchandiseId: l.variantId,
                    quantity: l.quantity,
                    attributes: l.attributes,
                })),
            });
            return unwrapMutation(data?.cartLinesAdd as MutationResultEnvelope | null | undefined, 'cartLinesAdd');
        } catch (error) {
            throw wrapTransportError(error, 'addLines');
        }
    },

    async updateLines({ cartId, shop, locale, lines }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
            };
            const { data } = await api.mutate(CART_LINES_UPDATE_MUTATION, { cartId, lines });
            return unwrapMutation(
                data?.cartLinesUpdate as MutationResultEnvelope | null | undefined,
                'cartLinesUpdate',
            );
        } catch (error) {
            throw wrapTransportError(error, 'updateLines');
        }
    },

    async removeLines({ cartId, shop, locale, lineIds }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
            };
            const { data } = await api.mutate(CART_LINES_REMOVE_MUTATION, { cartId, lineIds });
            return unwrapMutation(
                data?.cartLinesRemove as MutationResultEnvelope | null | undefined,
                'cartLinesRemove',
            );
        } catch (error) {
            throw wrapTransportError(error, 'removeLines');
        }
    },

    async applyDiscountCodes({ cartId, shop, locale, codes }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
            };
            const { data } = await api.mutate(CART_DISCOUNT_CODES_UPDATE_MUTATION, {
                cartId,
                discountCodes: codes,
            });
            return unwrapMutation(
                data?.cartDiscountCodesUpdate as MutationResultEnvelope | null | undefined,
                'cartDiscountCodesUpdate',
            );
        } catch (error) {
            throw wrapTransportError(error, 'applyDiscountCodes');
        }
    },

    async applyGiftCardCodes({ cartId, shop, locale, codes }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
            };
            const { data } = await api.mutate(CART_GIFT_CARD_CODES_UPDATE_MUTATION, {
                cartId,
                giftCardCodes: codes,
            });
            return unwrapMutation(
                data?.cartGiftCardCodesUpdate as MutationResultEnvelope | null | undefined,
                'cartGiftCardCodesUpdate',
            );
        } catch (error) {
            throw wrapTransportError(error, 'applyGiftCardCodes');
        }
    },

    async removeGiftCardCodes({ cartId, shop, locale, ids }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
            };
            const { data } = await api.mutate(CART_GIFT_CARD_CODES_REMOVE_MUTATION, {
                cartId,
                appliedGiftCardIds: ids,
            });
            return unwrapMutation(
                data?.cartGiftCardCodesRemove as MutationResultEnvelope | null | undefined,
                'cartGiftCardCodesRemove',
            );
        } catch (error) {
            throw wrapTransportError(error, 'removeGiftCardCodes');
        }
    },

    async updateBuyerIdentity({ cartId, shop, locale, buyerIdentity }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
            };
            const { data } = await api.mutate(CART_BUYER_IDENTITY_UPDATE_MUTATION, {
                cartId,
                buyerIdentity: serializeBuyerIdentity(buyerIdentity),
            });
            return unwrapMutation(
                data?.cartBuyerIdentityUpdate as MutationResultEnvelope | null | undefined,
                'cartBuyerIdentityUpdate',
            );
        } catch (error) {
            throw wrapTransportError(error, 'updateBuyerIdentity');
        }
    },

    async updateNote({ cartId, shop, locale, note }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
            };
            const { data } = await api.mutate(CART_NOTE_UPDATE_MUTATION, { cartId, note });
            return unwrapMutation(data?.cartNoteUpdate as MutationResultEnvelope | null | undefined, 'cartNoteUpdate');
        } catch (error) {
            throw wrapTransportError(error, 'updateNote');
        }
    },

    async updateAttributes({ cartId, shop, locale, attributes }) {
        try {
            const api = (await ShopifyApolloApiClient({ shop, locale })) as unknown as {
                mutate: (m: unknown, v: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null }>;
            };
            const { data } = await api.mutate(CART_ATTRIBUTES_UPDATE_MUTATION, { cartId, attributes });
            return unwrapMutation(
                data?.cartAttributesUpdate as MutationResultEnvelope | null | undefined,
                'cartAttributesUpdate',
            );
        } catch (error) {
            throw wrapTransportError(error, 'updateAttributes');
        }
    },
};

export default shopifyCartAdapter;
