'use client';

import type { CartEvent, CartEventType } from '@nordcom/cart-core';
import { useEffect } from 'react';

type Handler<E extends CartEventType> = (event: Extract<CartEvent, { type: E }>) => void;

type Bus = {
    on<E extends CartEventType>(type: E, handler: Handler<E>): () => void;
    emit(event: CartEvent): void;
};

const handlers = new Map<CartEventType, Set<Handler<CartEventType>>>();

/**
 * Module-level client cart event bus. Lives outside React state so the
 * provider can emit during commits and subscribers in unrelated subtrees can
 * still observe without subscribing through context. Microtask-scheduled
 * delivery so a slow handler can never block a mutation completion.
 */
export const clientCartBus: Bus = {
    on(type, handler) {
        let set = handlers.get(type);
        if (!set) {
            set = new Set();
            handlers.set(type, set);
        }
        set.add(handler as unknown as Handler<CartEventType>);
        return () => {
            set?.delete(handler as unknown as Handler<CartEventType>);
        };
    },
    emit(event) {
        const set = handlers.get(event.type);
        if (!set) return;
        for (const h of set) {
            queueMicrotask(() => {
                try {
                    (h as Handler<typeof event.type>)(event as never);
                } catch {
                    // Handler errors are swallowed; one bad subscriber shouldn't
                    // poison the rest of the bus.
                }
            });
        }
    },
};

/**
 * Subscribe to a single cart event type for the lifetime of the calling
 * component. Re-subscribes whenever `type` or `handler` identity changes —
 * stabilize the handler with `useCallback` to avoid churn.
 *
 * @typeParam E - The event type literal to subscribe to.
 * @param type - Cart event type (e.g. `'cart.updated'`).
 * @param handler - Handler invoked once per matching event delivery.
 */
export function useCartEvents<E extends CartEventType>(type: E, handler: Handler<E>): void {
    useEffect(() => clientCartBus.on(type, handler), [type, handler]);
}
