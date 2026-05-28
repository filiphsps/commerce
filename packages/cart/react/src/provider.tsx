'use client';

import type {
    BuyerIdentity,
    Cart,
    CartActionResult,
    CartCapabilities,
    CartMutation,
    MutationEnvelope,
    NewCartLine,
    ProductSnapshot,
    SubmitMutation,
} from '@nordcom/cart-core';
import { type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState, useTransition } from 'react';
import type { CartActions } from './actions-type';
import {
    CartActionsContext,
    CartCapabilitiesContext,
    CartCostContext,
    CartCountContext,
    CartDispatchContext,
    CartLinesContext,
    CartMetaContext,
    CartPendingContext,
    CartStatusContext,
} from './contexts';
import { project } from './projection';
import { initialQueueState, queueReducer } from './queue';
import type { AppCartConfig, CartPredictor, ClientAuthBridge, KernelSnapshot, LinePredictor } from './types';
import { clientCartBus } from './use-events';

/**
 * Generate a unique idempotency key per mutation submission. Uses
 * `crypto.randomUUID` when available, falling back to a timestamp + random
 * string for environments without WebCrypto.
 *
 * @returns A fresh, opaque idempotency key suitable for one mutation envelope.
 */
const cryptoRandomId = (): string =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Reduce a failed cart action result into a single user-facing message.
 * Prefers `message`, then the first `userErrors` entry, then a generic
 * fallback so consumers never render `undefined`.
 *
 * @param result - The failure half of {@link CartActionResult}.
 * @returns A non-empty message string for display.
 */
function formatUserError(result: Extract<CartActionResult, { ok: false }>): string {
    return result.message || result.userErrors?.[0]?.message || 'Cart action failed.';
}

/**
 * Props for {@link CartProvider}. Wires the kernel snapshot, mutation handler,
 * and optional optimistic predictors into the React context tree.
 *
 * @example
 * ```tsx
 * const props: CartProviderProps<AppConfig> = {
 *     kernelSnapshot,
 *     submitMutation: submitCartMutation,
 *     initialCart,
 *     shopId: shop.id,
 *     children: <App />,
 * };
 * ```
 */
export interface CartProviderProps<Cfg extends AppCartConfig> {
    kernelSnapshot: KernelSnapshot<Cfg['caps']>;
    submitMutation: SubmitMutation<Cfg['ext']>;
    initialCart: Cart<Cfg['ext']> | null;
    shopId: string;
    predictors?: { line?: LinePredictor<Cfg['ext']>[]; cart?: CartPredictor<Cfg['ext']>[] };
    clientAuthBridge?: ClientAuthBridge;
    children: ReactNode;
}

/**
 * Root context provider for the Nordcom cart. Manages the optimistic mutation
 * queue, projects the cart for all slice hooks, synchronizes state with
 * cross-tab broadcasts, and optionally keeps buyer identity in sync via a
 * client auth bridge.
 *
 * @param props.kernelSnapshot - Adapter capabilities and custom mutation names
 *   from the server-side kernel; drives the shape of the action surface.
 * @param props.submitMutation - Server action (or API call) that persists a
 *   mutation and returns the updated cart.
 * @param props.initialCart - Cart fetched at render time; seeded into the
 *   queue on the first commit.
 * @param props.shopId - Tenant shop id; scopes the BroadcastChannel used for
 *   cross-tab cart sync.
 * @param props.predictors - Optional optimistic predictor chains applied before
 *   the server confirms the mutation.
 * @param props.clientAuthBridge - Optional React hook bridge that surfaces
 *   `BuyerIdentity`; triggers `update-buyer-identity` when identity changes.
 * @param props.children - React subtree that receives cart context.
 * @returns A stack of React context providers wrapping `children`.
 * @example
 * ```tsx
 * <CartProvider
 *   kernelSnapshot={kernelSnapshot}
 *   submitMutation={submitCartMutation}
 *   initialCart={initialCart}
 *   shopId={shop.id}
 * >
 *   {children}
 * </CartProvider>
 * ```
 */
export function CartProvider<Cfg extends AppCartConfig>(props: CartProviderProps<Cfg>) {
    const { kernelSnapshot, submitMutation, initialCart, shopId, predictors, clientAuthBridge, children } = props;
    const [state, dispatch] = useReducer(queueReducer, undefined, () => initialQueueState());
    const [seeded, setSeeded] = useState(false);
    const [, startTransition] = useTransition();
    const [statusError, setStatusError] = useReducer(
        (_: string | null, next: string | null) => next,
        null as string | null,
    );
    const broadcastRef = useRef<BroadcastChannel | null>(null);

    useEffect(() => {
        if (seeded) return;
        setSeeded(true);
        startTransition(() => dispatch({ type: 'setInitial', cart: initialCart as Cart | null }));
    }, [initialCart, seeded]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
        const channel = new BroadcastChannel(`nordcom-cart:${shopId}`);
        channel.onmessage = (event) => {
            const data = event.data as { type?: string; cart?: Cart; mutation?: CartMutation };
            if (data?.type === 'cart-updated' && data.cart) {
                dispatch({ type: 'externalUpdate', cart: data.cart });
                if (data.mutation) {
                    clientCartBus.emit({
                        type: 'cart.updated',
                        cart: data.cart,
                        mutation: data.mutation,
                        source: 'broadcast',
                    });
                }
            }
        };
        broadcastRef.current = channel;
        return () => {
            channel.close();
            broadcastRef.current = null;
        };
    }, [shopId]);

    const runMutation = useCallback(
        async (mutation: CartMutation): Promise<CartActionResult> => {
            const id = cryptoRandomId();
            dispatch({ type: 'enqueue', id, mutation });
            dispatch({ type: 'startInFlight', id });
            const envelope: MutationEnvelope = { mutation, idempotencyKey: id };
            try {
                const result = (await submitMutation(envelope)) as CartActionResult;
                if (result.ok) {
                    dispatch({ type: 'confirm', id, cart: result.cart });
                    broadcastRef.current?.postMessage({
                        type: 'cart-updated',
                        cart: result.cart,
                        mutation,
                    });
                    setStatusError(null);
                    clientCartBus.emit({
                        type: 'cart.updated',
                        cart: result.cart,
                        mutation,
                        source: 'self',
                    });
                } else {
                    const message = formatUserError(result);
                    dispatch({ type: 'fail', id, message });
                    setStatusError(message);
                    if (result.cart) dispatch({ type: 'externalUpdate', cart: result.cart });
                    clientCartBus.emit({
                        type: 'cart.mutation.failed',
                        mutation,
                        error: new Error(message),
                        source: 'self',
                    });
                }
                return result;
            } catch (error) {
                const message = (error as Error)?.message ?? 'Cart action failed.';
                dispatch({ type: 'fail', id, message });
                setStatusError(message);
                clientCartBus.emit({
                    type: 'cart.mutation.failed',
                    mutation,
                    error: error instanceof Error ? error : new Error(message),
                    source: 'self',
                });
                return { ok: false, reason: 'network-error', message };
            }
        },
        [submitMutation],
    );

    const projection = useMemo(
        () =>
            project({
                confirmed: state.confirmed,
                pending: state.pending,
                linePredictors: (predictors?.line ?? []) as LinePredictor[],
                cartPredictors: (predictors?.cart ?? []) as CartPredictor[],
            }),
        [state.confirmed, state.pending, predictors?.line, predictors?.cart],
    );

    const countValue = projection.totalQuantity;
    const linesValue = useMemo(
        () => ({ lines: projection.lines, cartId: state.confirmed?.id ?? null }),
        [projection.lines, state.confirmed?.id],
    );
    const costValue = useMemo(
        () => ({
            subtotal: projection.cost.subtotal,
            total: projection.cost.total,
            tax: projection.cost.tax,
            shipping: projection.cost.shipping,
            stale: projection.costStale,
        }),
        [projection.cost, projection.costStale],
    );
    const metaValue = useMemo(
        () => ({
            discountCodes: projection.discountCodes,
            giftCards: projection.giftCards,
            buyerIdentity: projection.buyerIdentity,
            note: projection.note,
            attributes: projection.attributes,
            checkoutUrl: projection.checkoutUrl,
        }),
        [
            projection.discountCodes,
            projection.giftCards,
            projection.buyerIdentity,
            projection.note,
            projection.attributes,
            projection.checkoutUrl,
        ],
    );
    const statusValue = useMemo(
        () => ({
            status: state.pending.some((p) => p.status === 'in-flight') ? ('mutating' as const) : ('idle' as const),
            error: statusError,
            cartReady: seeded,
        }),
        [state.pending, statusError, seeded],
    );
    const pendingValue = state.pending;

    const dispatchMutation = useCallback((m: CartMutation) => runMutation(m), [runMutation]);

    const actions = useMemo<CartActions<CartCapabilities>>(() => {
        const out: Record<string, unknown> = {
            addLine: (input: NewCartLine & { snapshot?: ProductSnapshot }) =>
                runMutation({
                    kind: 'add-line',
                    variantId: input.variantId,
                    quantity: input.quantity,
                    attributes: input.attributes,
                    snapshot: input.snapshot,
                }),
            updateLine: (input: { lineId: string; quantity: number }) =>
                runMutation({ kind: 'update-line', lineId: input.lineId, quantity: input.quantity }),
            removeLine: (lineId: string) => runMutation({ kind: 'remove-line', lineId }),
        };
        const caps = kernelSnapshot.capabilities;
        if (caps.giftCards) {
            out.applyGiftCard = (code: string) => runMutation({ kind: 'apply-gift-card', code });
            out.removeGiftCard = (id: string) => runMutation({ kind: 'remove-gift-card', id });
        }
        if (caps.multipleDiscountCodes) {
            out.applyDiscountCode = (code: string) => runMutation({ kind: 'apply-discount', code });
            out.removeDiscountCode = (code: string) => runMutation({ kind: 'remove-discount', code });
        }
        if (caps.notes) out.updateNote = (note: string) => runMutation({ kind: 'update-note', note });
        if (caps.cartAttributes) {
            out.updateAttributes = (attributes: Array<{ key: string; value: string }>) =>
                runMutation({ kind: 'update-attributes', attributes });
        }
        if (caps.buyerIdentity) out.updateBuyerIdentity = () => runMutation({ kind: 'update-buyer-identity' });
        return out as CartActions<CartCapabilities>;
    }, [kernelSnapshot.capabilities, runMutation]);

    return (
        <CartCapabilitiesContext.Provider value={kernelSnapshot.capabilities}>
            <CartActionsContext.Provider value={actions}>
                <CartDispatchContext.Provider value={dispatchMutation}>
                    <CartCountContext.Provider value={countValue}>
                        <CartLinesContext.Provider value={linesValue}>
                            <CartCostContext.Provider value={costValue}>
                                <CartMetaContext.Provider value={metaValue}>
                                    <CartStatusContext.Provider value={statusValue}>
                                        <CartPendingContext.Provider value={pendingValue}>
                                            {clientAuthBridge ? (
                                                <BuyerIdentitySync
                                                    bridge={clientAuthBridge}
                                                    dispatchMutation={dispatchMutation}
                                                />
                                            ) : null}
                                            {children}
                                        </CartPendingContext.Provider>
                                    </CartStatusContext.Provider>
                                </CartMetaContext.Provider>
                            </CartCostContext.Provider>
                        </CartLinesContext.Provider>
                    </CartCountContext.Provider>
                </CartDispatchContext.Provider>
            </CartActionsContext.Provider>
        </CartCapabilitiesContext.Provider>
    );
}
CartProvider.displayName = 'Nordcom.CartProvider';

/**
 * Build a stable key from the fields of {@link BuyerIdentity} that should
 * trigger a cart update when they change. JSON.stringify is fine here — the
 * input shape is small and the comparison runs once per identity change.
 *
 * @param b - Current buyer identity (or null when signed out).
 * @returns A string key; `''` for null identities.
 */
function buyerIdentityKey(b: BuyerIdentity | null): string {
    if (!b) return '';
    return JSON.stringify({ e: b.email, p: b.phone, c: b.countryCode, pr: b.provider });
}

/**
 * Subscribes to buyer identity changes reported by the auth bridge and
 * dispatches `update-buyer-identity` mutations whenever the identity key
 * changes. Renders nothing — used purely for its side-effect.
 *
 * @param props.bridge - Client auth bridge whose `useBuyerIdentity` hook is
 *   called on each render to detect identity changes.
 * @param props.dispatchMutation - Stable dispatch function from the enclosing
 *   {@link CartProvider}.
 * @returns `null`.
 */
function BuyerIdentitySync({
    bridge,
    dispatchMutation,
}: {
    bridge: ClientAuthBridge;
    dispatchMutation: (m: CartMutation) => Promise<CartActionResult>;
}) {
    const { identity } = bridge.useBuyerIdentity();
    const lastKeyRef = useRef('');
    useEffect(() => {
        const key = buyerIdentityKey(identity);
        if (key === lastKeyRef.current) return;
        lastKeyRef.current = key;
        if (!identity) return;
        void dispatchMutation({ kind: 'update-buyer-identity' });
    }, [identity, dispatchMutation]);
    return null;
}
