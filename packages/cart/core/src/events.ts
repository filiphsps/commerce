import type { Cart, CartLine, CartMutation, ILogger } from './types';

export type CartEvent =
    | { type: 'cart.created'; cart: Cart }
    | { type: 'cart.updated'; cart: Cart; mutation: CartMutation; source: 'self' | 'broadcast' }
    | { type: 'cart.mutation.failed'; mutation: CartMutation; error: Error; source: 'self' }
    | { type: 'cart.line.added'; line: CartLine; cart: Cart }
    | { type: 'cart.line.removed'; lineId: string; cart: Cart }
    | { type: 'cart.cleared' };

export type CartEventType = CartEvent['type'];

export type CartEventHandler<E extends CartEventType> = (
    event: Extract<CartEvent, { type: E }>,
) => void | Promise<void>;

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
            set.add(handler as CartEventHandler<CartEventType>);
            return () => {
                set?.delete(handler as CartEventHandler<CartEventType>);
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
