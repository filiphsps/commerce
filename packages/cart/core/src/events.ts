import type { Cart, CartLine, CartMutation, ILogger } from './types';

/**
 * Discriminated union of every lifecycle event the cart kernel can emit.
 * Consumers subscribe via {@link CartEventBus.on} and switch on `event.type`
 * to handle the specific variant they care about.
 *
 * @example
 * ```ts
 * bus.on('cart.updated', (event: CartEvent & { type: 'cart.updated' }) => {
 *   analytics.track('cart_updated', { cartId: event.cart.id });
 * });
 * ```
 */
export type CartEvent =
    | { type: 'cart.created'; cart: Cart }
    | { type: 'cart.updated'; cart: Cart; mutation: CartMutation; source: 'self' | 'broadcast' }
    | { type: 'cart.mutation.failed'; mutation: CartMutation; error: Error; source: 'self' }
    | { type: 'cart.line.added'; line: CartLine; cart: Cart }
    | { type: 'cart.line.removed'; lineId: string; cart: Cart }
    | { type: 'cart.cleared' };

/**
 * Union of the string literal type discriminants for every {@link CartEvent}
 * variant. Use as a constraint when narrowing to a specific event type or when
 * parameterizing {@link CartEventHandler}.
 *
 * @example
 * ```ts
 * function subscribe(bus: CartEventBus, type: CartEventType) {
 *   return bus.on(type, (event) => console.log(event));
 * }
 * ```
 */
export type CartEventType = CartEvent['type'];

/**
 * Callback signature for a subscriber to a specific {@link CartEvent} variant.
 * The generic narrows the `event` parameter to exactly the variant identified
 * by `E`, so handlers receive strongly-typed payloads without casting.
 *
 * @example
 * ```ts
 * const onCreated: CartEventHandler<'cart.created'> = (event) => {
 *   console.log('new cart', event.cart.id);
 * };
 * ```
 */
export type CartEventHandler<E extends CartEventType> = (
    event: Extract<CartEvent, { type: E }>,
) => void | Promise<void>;

/**
 * In-process pub/sub channel through which the kernel broadcasts cart
 * lifecycle events. Returned by {@link createEventBus}; passed to
 * {@link createCart} internally and exposed on the returned {@link CartKernel}
 * via its `on` method.
 *
 * @example
 * ```ts
 * const bus = createEventBus({ logger: consoleLogger });
 * const off = bus.on('cart.updated', (e) => syncStore(e.cart));
 * // later:
 * off(); // unsubscribe
 * ```
 */
export interface CartEventBus {
    on<E extends CartEventType>(type: E, handler: CartEventHandler<E>): () => void;
    emit(event: CartEvent): void;
}

/**
 * In-process event bus used by the cart kernel to broadcast lifecycle events
 * to UI layers (React store, analytics, tab sync). Delivery is fire-and-forget
 * via `queueMicrotask` so that emitting never blocks the caller and handler
 * failures cannot poison the mutation pipeline.
 *
 * @param opts.logger - Sink for handler errors; failures are swallowed and
 *   surfaced via `logger.warn`.
 * @returns A {@link CartEventBus} with `on` (returns dispose) and `emit`.
 * @example
 * ```ts
 * const bus = createEventBus({ logger: consoleLogger });
 * const off = bus.on('cart.created', (e) => console.log('created', e.cart.id));
 * bus.emit({ type: 'cart.cleared' });
 * off();
 * ```
 */
export function createEventBus(opts: { logger: ILogger }): CartEventBus {
    const handlers = new Map<CartEventType, Set<CartEventHandler<CartEventType>>>();

    return {
        on(type, handler) {
            let set = handlers.get(type);
            if (!set) {
                set = new Set();
                handlers.set(type, set);
            }
            set.add(handler as unknown as CartEventHandler<CartEventType>);
            return () => {
                set?.delete(handler as unknown as CartEventHandler<CartEventType>);
            };
        },
        emit(event) {
            const set = handlers.get(event.type);
            if (!set) return;
            for (const handler of set) {
                queueMicrotask(() => {
                    try {
                        const result = (handler as CartEventHandler<typeof event.type>)(event as never);
                        if (result && typeof (result as Promise<void>).catch === 'function') {
                            (result as Promise<void>).catch((error) =>
                                opts.logger.warn('cart event handler failed', {
                                    type: event.type,
                                    error: (error as Error)?.message,
                                }),
                            );
                        }
                    } catch (error) {
                        opts.logger.warn('cart event handler failed', {
                            type: event.type,
                            error: (error as Error)?.message,
                        });
                    }
                });
            }
        },
    };
}
