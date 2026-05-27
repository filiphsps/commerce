import {
    type AdapterCtx,
    type BuyerIdentity,
    type Cart,
    type CartAdapter,
    type CartCapabilities,
    CartNotFoundError,
    CartProviderError,
    CartUserError,
} from '@nordcom/cart-core';
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
import type { ShopifyTransport } from './transport';

const DEFAULT_CAPABILITIES: CartCapabilities = {
    giftCards: true,
    multipleDiscountCodes: true,
    buyerIdentity: true,
    notes: true,
    cartAttributes: true,
    lineAttributes: true,
    customMutations: ['updateBuyerCountry'],
};

const TYPED_NAMES = new Set(['CartUserError', 'CartNotFoundError', 'CartProviderError']);

type MutationEnvelope = {
    cart: unknown;
    userErrors: Array<{ field?: string; message: string }>;
};

/**
 * Lets pre-typed cart errors (`CartUserError`, `CartNotFoundError`,
 * `CartProviderError`) bubble through unchanged so the kernel's classification
 * logic stays accurate; anything else is wrapped in `CartProviderError` with
 * the original preserved as `cause`.
 *
 * Matches by `error.name` instead of `instanceof` because the cart-core base
 * class can lose its prototype across package boundaries (SSR → client, worker
 * → main) — see CartError doc for details.
 *
 * @param error - The caught throwable.
 * @param opName - Operation name surfaced in the wrapped message for logs.
 * @throws Always — either the original error or a new `CartProviderError`.
 */
function wrapTransportError(error: unknown, opName: string): never {
    const name = (error as Error)?.name;
    if (name && TYPED_NAMES.has(name)) throw error;
    throw new CartProviderError(`Shopify cart ${opName} failed: ${(error as Error)?.message ?? String(error)}`, error);
}

/**
 * Unwraps Shopify's `{ cart, userErrors }` mutation envelope into a normalised
 * cart-core `Cart`. Non-empty `userErrors` mean caller-supplied input was
 * rejected upstream; we surface that as `CartUserError` so retry middleware
 * does NOT retry it.
 *
 * @param envelope - Raw `data.cart<X>` payload from Shopify.
 * @param op - Mutation name (e.g. `cartLinesAdd`) used in error messages.
 * @returns Normalised cart.
 * @throws {CartProviderError} When the envelope is absent or normalisation
 *   produces a null cart (Shopify returned an empty `cart` field).
 * @throws {CartUserError} When the envelope carries non-empty `userErrors`.
 */
function unwrap(envelope: MutationEnvelope | null | undefined, op: string): Cart {
    if (!envelope) throw new CartProviderError(`Shopify ${op} returned no envelope`);
    if (envelope.userErrors && envelope.userErrors.length > 0) throw new CartUserError(envelope.userErrors);
    const cart = normalize(envelope.cart);
    if (!cart) throw new CartProviderError(`Shopify ${op} returned no cart`);
    return cart;
}

/**
 * Builds the `@inContext(language:, country:)` variable pair Shopify expects.
 * Both values are upper-cased because the Storefront API enum types are
 * `LanguageCode` / `CountryCode` (all-caps), even though cart-core stores
 * locale codes in their original case.
 *
 * @param ctx - Adapter context carrying the active locale.
 * @returns `{ language, country }` ready to spread into a mutation's variables.
 */
function inContext(ctx: AdapterCtx): { language: string; country: string } {
    return { language: ctx.locale.language.toUpperCase(), country: ctx.locale.country.toUpperCase() };
}

/**
 * Produces the cart attribute used as a second-line idempotency guard for
 * cross-instance retries. Kernel-side dedup is the primary defence; this
 * attribute is what proves uniqueness when two replicas both reach Shopify
 * before the kernel cache settles.
 *
 * @param ctx - Adapter context; idempotency comes from `ctx.idempotencyKey`.
 * @returns Single-element array when a key is present, empty otherwise.
 */
function idempotencyAttribute(ctx: AdapterCtx): Array<{ key: string; value: string }> {
    return ctx.idempotencyKey ? [{ key: '__idempotency', value: ctx.idempotencyKey }] : [];
}

/**
 * Maps cart-core's `BuyerIdentity` onto Shopify's `CartBuyerIdentityInput`.
 * The customer access token is sourced from `provider.data.customerAccessToken`
 * only when `provider.type === 'shopify'` — for non-shopify providers (e.g.
 * a host SSO bridge) we deliberately omit it so Shopify treats the cart as
 * guest-anonymous instead of failing with an "invalid token" error.
 *
 * @param b - Cart-core buyer identity, typically from `args.buyerIdentity`.
 * @returns Variables payload for `cartBuyerIdentityUpdate.buyerIdentity`.
 */
function serializeBuyerIdentity(b: BuyerIdentity): Record<string, unknown> {
    const customerAccessToken =
        b.provider?.type === 'shopify' ? (b.provider.data?.customerAccessToken as string | undefined) : undefined;
    return {
        email: b.email,
        phone: b.phone,
        countryCode: b.countryCode,
        customerAccessToken,
    };
}

/**
 * Builds a Shopify-backed `CartAdapter` over an injected transport. The
 * adapter has no global side effects, no implicit tenant resolution — every
 * call accepts `ctx.shop` + `ctx.locale` so the transport stays the sole
 * decision point for which Storefront API instance handles the request.
 *
 * @param opts.transport - Implementation that knows how to dispatch
 *   `query` / `mutate` against the right tenant; supplied by the host.
 * @param opts.capabilities - Optional partial override of the default
 *   capability set; merged onto {@link DEFAULT_CAPABILITIES}.
 * @returns A fully wired `CartAdapter<{}>` ready to plug into `createCart`.
 */
export function createShopifyCartAdapter(opts: {
    transport: ShopifyTransport;
    capabilities?: Partial<CartCapabilities>;
}): CartAdapter {
    const capabilities: CartCapabilities = { ...DEFAULT_CAPABILITIES, ...opts.capabilities };
    const { transport } = opts;

    return {
        type: 'shopify',
        capabilities,

        async getCart(ctx, args) {
            try {
                const { data } = await transport.query<{ cart: unknown }>(
                    CART_QUERY,
                    { cartId: args.cartId, ...inContext(ctx) },
                    ctx,
                );
                if (!data?.cart) throw new CartNotFoundError(args.cartId);
                return normalize(data.cart);
            } catch (error) {
                wrapTransportError(error, 'getCart');
            }
        },

        async createCart(ctx, args) {
            try {
                const input: Record<string, unknown> = {};
                if (args.lines) {
                    input.lines = args.lines.map((l) => ({
                        merchandiseId: l.variantId,
                        quantity: l.quantity,
                        attributes: l.attributes,
                    }));
                }
                if (args.buyerIdentity) input.buyerIdentity = serializeBuyerIdentity(args.buyerIdentity);
                const attrs = idempotencyAttribute(ctx);
                if (attrs.length) input.attributes = attrs;
                const { data } = await transport.mutate<{ cartCreate: MutationEnvelope }>(
                    CART_CREATE_MUTATION,
                    { input, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartCreate ?? null, 'cartCreate');
            } catch (error) {
                wrapTransportError(error, 'createCart');
            }
        },

        async addLines(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartLinesAdd: MutationEnvelope }>(
                    CART_LINES_ADD_MUTATION,
                    {
                        cartId: args.cartId,
                        lines: args.lines.map((l) => ({
                            merchandiseId: l.variantId,
                            quantity: l.quantity,
                            attributes: l.attributes,
                        })),
                        ...inContext(ctx),
                    },
                    ctx,
                );
                return unwrap(data?.cartLinesAdd ?? null, 'cartLinesAdd');
            } catch (error) {
                wrapTransportError(error, 'addLines');
            }
        },

        async updateLines(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartLinesUpdate: MutationEnvelope }>(
                    CART_LINES_UPDATE_MUTATION,
                    { cartId: args.cartId, lines: args.lines, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartLinesUpdate ?? null, 'cartLinesUpdate');
            } catch (error) {
                wrapTransportError(error, 'updateLines');
            }
        },

        async removeLines(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartLinesRemove: MutationEnvelope }>(
                    CART_LINES_REMOVE_MUTATION,
                    { cartId: args.cartId, lineIds: args.lineIds, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartLinesRemove ?? null, 'cartLinesRemove');
            } catch (error) {
                wrapTransportError(error, 'removeLines');
            }
        },

        async applyDiscountCodes(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartDiscountCodesUpdate: MutationEnvelope }>(
                    CART_DISCOUNT_CODES_UPDATE_MUTATION,
                    { cartId: args.cartId, discountCodes: args.codes, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartDiscountCodesUpdate ?? null, 'cartDiscountCodesUpdate');
            } catch (error) {
                wrapTransportError(error, 'applyDiscountCodes');
            }
        },

        async applyGiftCardCodes(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartGiftCardCodesUpdate: MutationEnvelope }>(
                    CART_GIFT_CARD_CODES_UPDATE_MUTATION,
                    { cartId: args.cartId, giftCardCodes: args.codes, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartGiftCardCodesUpdate ?? null, 'cartGiftCardCodesUpdate');
            } catch (error) {
                wrapTransportError(error, 'applyGiftCardCodes');
            }
        },

        async removeGiftCardCodes(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartGiftCardCodesRemove: MutationEnvelope }>(
                    CART_GIFT_CARD_CODES_REMOVE_MUTATION,
                    { cartId: args.cartId, appliedGiftCardIds: args.ids, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartGiftCardCodesRemove ?? null, 'cartGiftCardCodesRemove');
            } catch (error) {
                wrapTransportError(error, 'removeGiftCardCodes');
            }
        },

        async updateBuyerIdentity(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartBuyerIdentityUpdate: MutationEnvelope }>(
                    CART_BUYER_IDENTITY_UPDATE_MUTATION,
                    {
                        cartId: args.cartId,
                        buyerIdentity: serializeBuyerIdentity(args.buyerIdentity),
                        ...inContext(ctx),
                    },
                    ctx,
                );
                return unwrap(data?.cartBuyerIdentityUpdate ?? null, 'cartBuyerIdentityUpdate');
            } catch (error) {
                wrapTransportError(error, 'updateBuyerIdentity');
            }
        },

        async updateNote(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartNoteUpdate: MutationEnvelope }>(
                    CART_NOTE_UPDATE_MUTATION,
                    { cartId: args.cartId, note: args.note, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartNoteUpdate ?? null, 'cartNoteUpdate');
            } catch (error) {
                wrapTransportError(error, 'updateNote');
            }
        },

        async updateAttributes(ctx, args) {
            try {
                const { data } = await transport.mutate<{ cartAttributesUpdate: MutationEnvelope }>(
                    CART_ATTRIBUTES_UPDATE_MUTATION,
                    { cartId: args.cartId, attributes: args.attributes, ...inContext(ctx) },
                    ctx,
                );
                return unwrap(data?.cartAttributesUpdate ?? null, 'cartAttributesUpdate');
            } catch (error) {
                wrapTransportError(error, 'updateAttributes');
            }
        },

        customMutations: {
            async updateBuyerCountry(ctx, args) {
                const country = (args.payload as { country: string }).country;
                try {
                    const { data } = await transport.mutate<{ cartBuyerIdentityUpdate: MutationEnvelope }>(
                        CART_BUYER_IDENTITY_UPDATE_MUTATION,
                        {
                            cartId: args.cartId,
                            buyerIdentity: { countryCode: country.toUpperCase() },
                            ...inContext(ctx),
                        },
                        ctx,
                    );
                    return unwrap(data?.cartBuyerIdentityUpdate ?? null, 'cartBuyerIdentityUpdate(updateBuyerCountry)');
                } catch (error) {
                    wrapTransportError(error, 'updateBuyerCountry');
                }
            },
        },
    };
}
