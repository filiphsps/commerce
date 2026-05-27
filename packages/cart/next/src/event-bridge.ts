import type { CartEvent, CartKernel } from '@nordcom/cart-core';
import { after } from 'next/server';

/**
 * Per-event handler map passed to {@link nextEventBridge}. Each key is a
 * {@link CartEvent} discriminant; TypeScript infers the narrowed event payload
 * for that variant so handlers receive the concrete fields — `cart`, `line`,
 * `mutation` — without casting. Omit keys for events you don't need to handle.
 *
 * @example
 * ```ts
 * const handlers: NextEventBridgeHandlers = {
 *     'cart.line.added': async (event) => {
 *         await analytics.track('AddToCart', { lineId: event.line.id });
 *     },
 * };
 * ```
 */
export type NextEventBridgeHandlers = Partial<{
    [E in CartEvent['type']]: (event: Extract<CartEvent, { type: E }>) => Promise<void> | void;
}>;

/**
 * Return type of {@link nextEventBridge}. Exposes a single `onKernel` method
 * that wires the configured event handlers to a kernel's event bus — call it
 * once per request lifecycle after constructing the kernel.
 *
 * @example
 * ```ts
 * const bridge = nextEventBridge({ handlers });
 * bridge.onKernel(kernel);
 * ```
 */
export interface NextEventBridge {
    /**
     * Subscribes the bridge's configured handlers to a cart kernel's event
     * bus. Each handler runs through Next.js's `after()` so the response is
     * sent immediately and the handler executes as fire-and-forget work on
     * the same request lifetime.
     *
     * @param kernel - Kernel whose events should drive the bridge handlers.
     */
    onKernel(kernel: CartKernel): void;
}

/**
 * Builds a Next.js-aware event bridge that pipes cart kernel events into
 * `after()` callbacks. Use this when a host needs to emit analytics, kick
 * off downstream webhooks, or trigger cache invalidations on cart changes
 * without blocking the user-facing response.
 *
 * Handlers are keyed by {@link CartEvent} type and may be async — failures
 * inside `after()` surface through Next's standard observability surface,
 * not the cart-core event-bus error sink (which only catches synchronous
 * throws from the kernel's `queueMicrotask` dispatcher).
 *
 * @param opts.handlers - Optional map of per-event handlers. Events with no
 *   handler are ignored — the bridge does not subscribe at all, keeping
 *   the `after()` queue empty.
 * @returns A {@link NextEventBridge} ready to bind to a kernel.
 */
export function nextEventBridge(opts?: { handlers?: NextEventBridgeHandlers }): NextEventBridge {
    const handlers: NextEventBridgeHandlers = opts?.handlers ?? {};
    return {
        onKernel(kernel) {
            (Object.keys(handlers) as Array<CartEvent['type']>).forEach((type) => {
                kernel.on(type, (event) => {
                    const fn = handlers[type];
                    if (!fn) return;
                    after(() => fn(event as never));
                });
            });
        },
    };
}
