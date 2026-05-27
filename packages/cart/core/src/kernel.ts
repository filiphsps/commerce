import type { CartAdapter, CartCapabilities } from './adapter';
import { type CartMiddleware, compose, type MutationFn } from './compose';
import { CartCapabilityUnsupportedError } from './errors';
import { type CartEvent, type CartEventHandler, type CartEventType, createEventBus } from './events';
import type { AdapterCtx, BuyerIdentity, Cart, CartExt, CartMutation, ILogger, NewCartLine } from './types';
import { consoleLogger } from './types';

export interface CartKernel<TExt extends CartExt = {}, TShop = unknown> {
    readonly type: string;
    readonly capabilities: CartCapabilities;
    read(ctx: AdapterCtx<TShop>, args: { cartId: string }): Promise<Cart<TExt> | null>;
    create(
        ctx: AdapterCtx<TShop>,
        args?: { lines?: NewCartLine[]; buyerIdentity?: BuyerIdentity },
    ): Promise<Cart<TExt>>;
    mutate(ctx: AdapterCtx<TShop>, mutation: CartMutation): Promise<Cart<TExt>>;
    on<E extends CartEventType>(type: E, handler: CartEventHandler<E>): () => void;
}

export interface CreateCartOpts<TExt extends CartExt = {}, _TShop = unknown> {
    adapter: CartAdapter<TExt>;
    middleware?: CartMiddleware[];
    logger?: ILogger;
}

/**
 * Builds a cart kernel bound to one adapter. The kernel is the host-facing
 * surface: it routes typed {@link CartMutation}s to adapter methods, gates
 * mutations against {@link CartCapabilities}, runs the middleware chain
 * around every dispatch, and broadcasts {@link CartEvent}s on success +
 * failure.
 *
 * The chain is composed once at construction; recreate the kernel when
 * `middleware` changes.
 *
 * @param opts.adapter - Provider-specific adapter implementing the cart-core
 *   contract.
 * @param opts.middleware - Outer-to-inner middleware layers wrapping the
 *   terminal dispatch.
 * @param opts.logger - Logger threaded into the event bus for handler-error
 *   surfacing. Defaults to {@link consoleLogger}.
 * @returns A {@link CartKernel} ready to read / create / mutate.
 */
export function createCart<TExt extends CartExt = {}, TShop = unknown>(
    opts: CreateCartOpts<TExt, TShop>,
): CartKernel<TExt, TShop> {
    const logger = opts.logger ?? consoleLogger;
    const events = createEventBus({ logger });

    const dispatch = async (mutation: CartMutation, ctx: AdapterCtx<TShop>): Promise<Cart<TExt>> => {
        const caps = opts.adapter.capabilities;
        const cartId = (mutation as { cartId?: string }).cartId ?? '';
        switch (mutation.kind) {
            case 'add-line':
                return opts.adapter.addLines(ctx, {
                    cartId,
                    lines: [
                        {
                            variantId: mutation.variantId,
                            quantity: mutation.quantity,
                            attributes: mutation.attributes,
                        },
                    ],
                });
            case 'update-line':
                return opts.adapter.updateLines(ctx, {
                    cartId,
                    lines: [{ id: mutation.lineId, quantity: mutation.quantity }],
                });
            case 'remove-line':
                return opts.adapter.removeLines(ctx, { cartId, lineIds: [mutation.lineId] });
            case 'apply-discount':
            case 'remove-discount': {
                if (!opts.adapter.applyDiscountCodes) {
                    throw new CartCapabilityUnsupportedError('multipleDiscountCodes');
                }
                return opts.adapter.applyDiscountCodes(ctx, { cartId, codes: [mutation.code] });
            }
            case 'apply-gift-card': {
                if (!caps.giftCards || !opts.adapter.applyGiftCardCodes) {
                    throw new CartCapabilityUnsupportedError('giftCards');
                }
                return opts.adapter.applyGiftCardCodes(ctx, { cartId, codes: [mutation.code] });
            }
            case 'remove-gift-card': {
                if (!caps.giftCards || !opts.adapter.removeGiftCardCodes) {
                    throw new CartCapabilityUnsupportedError('giftCards');
                }
                return opts.adapter.removeGiftCardCodes(ctx, { cartId, ids: [mutation.id] });
            }
            case 'update-note': {
                if (!caps.notes || !opts.adapter.updateNote) {
                    throw new CartCapabilityUnsupportedError('notes');
                }
                return opts.adapter.updateNote(ctx, { cartId, note: mutation.note });
            }
            case 'update-attributes': {
                if (!caps.cartAttributes || !opts.adapter.updateAttributes) {
                    throw new CartCapabilityUnsupportedError('cartAttributes');
                }
                return opts.adapter.updateAttributes(ctx, {
                    cartId,
                    attributes: mutation.attributes,
                });
            }
            case 'update-buyer-identity': {
                if (!caps.buyerIdentity || !opts.adapter.updateBuyerIdentity) {
                    throw new CartCapabilityUnsupportedError('buyerIdentity');
                }
                return opts.adapter.updateBuyerIdentity(ctx, { cartId, buyerIdentity: {} });
            }
            case 'custom': {
                const handler = opts.adapter.customMutations?.[mutation.name];
                if (!handler || !caps.customMutations.includes(mutation.name)) {
                    throw new CartCapabilityUnsupportedError(`customMutations.${mutation.name}`);
                }
                return handler(ctx, { cartId, payload: mutation.payload });
            }
        }
    };

    const terminal: MutationFn = async (mutation, ctx) => dispatch(mutation, ctx as AdapterCtx<TShop>);

    const chain = compose(...(opts.middleware ?? []))(terminal);

    const fireUpdated = (cart: Cart<TExt>, mutation: CartMutation) => {
        events.emit({
            type: 'cart.updated',
            cart: cart as Cart,
            mutation,
            source: 'self',
        });
    };

    return {
        type: opts.adapter.type,
        capabilities: opts.adapter.capabilities,
        async read(ctx, args) {
            return opts.adapter.getCart(ctx, args);
        },
        async create(ctx, args) {
            const cart = await opts.adapter.createCart(ctx, args ?? {});
            events.emit({ type: 'cart.created', cart: cart as Cart });
            return cart;
        },
        async mutate(ctx, mutation) {
            try {
                const cart = (await chain(mutation, ctx)) as Cart<TExt>;
                fireUpdated(cart, mutation);
                return cart;
            } catch (error) {
                const event: CartEvent = {
                    type: 'cart.mutation.failed',
                    mutation,
                    error: error as Error,
                    source: 'self',
                };
                events.emit(event);
                throw error;
            }
        },
        on(type, handler) {
            return events.on(type, handler);
        },
    };
}
