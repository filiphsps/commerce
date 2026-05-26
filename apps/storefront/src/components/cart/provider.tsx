'use client';

import type { ReactNode } from 'react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useOptimistic,
    useRef,
    useState,
    useTransition,
} from 'react';
import type { Cart, CartActionResult, CartLine, Money, NewCartLine } from '@/api/cart/types';
import {
    addToCartAction,
    applyDiscountCodeAction,
    applyGiftCardAction,
    removeCartLineAction,
    removeDiscountCodeAction,
    removeGiftCardAction,
    updateAttributesAction,
    updateBuyerIdentityAction,
    updateCartLineQuantityAction,
    updateNoteAction,
} from '@/app/[domain]/[locale]/_actions/cart';
import BuyerIdentitySync from './buyer-identity-sync';
import { applyOptimistic, type CartMutation } from './optimistic-reducer';

export type CartStatus = 'idle' | 'loading' | 'mutating' | 'error';

type CartCountValue = number;

type CartLinesValue = { lines: CartLine[]; cartId: string | null };

type CartCostValue = {
    subtotal: Money | null;
    total: Money | null;
    tax: Money | null;
    shipping: Money | null;
    stale: boolean;
};

type CartMetaValue = {
    discountCodes: Cart['discountCodes'];
    giftCards: Cart['giftCards'];
    buyerIdentity: Cart['buyerIdentity'];
    note: string | null;
    attributes: Cart['attributes'];
    checkoutUrl: string | null;
};

type CartStatusValue = { status: CartStatus; error: string | null; cartReady: boolean };

type CartActionsValue = {
    addLine: (input: NewCartLine) => Promise<CartActionResult>;
    updateLine: (input: { lineId: string; quantity: number }) => Promise<CartActionResult>;
    removeLine: (lineId: string) => Promise<CartActionResult>;
    applyDiscountCode: (code: string) => Promise<CartActionResult>;
    removeDiscountCode: (code: string) => Promise<CartActionResult>;
    applyGiftCard: (code: string) => Promise<CartActionResult>;
    removeGiftCard: (id: string) => Promise<CartActionResult>;
    updateNote: (note: string) => Promise<CartActionResult>;
    updateAttributes: (attrs: Array<{ key: string; value: string }>) => Promise<CartActionResult>;
    updateBuyerIdentity: () => void;
};

type InternalApi = {
    setInitialCart: (cart: Cart | null) => void;
    replaceCart: (cart: Cart) => void;
    setShopId: (shopId: string) => void;
};

const DEFAULT_COST: CartCostValue = { subtotal: null, total: null, tax: null, shipping: null, stale: false };
const DEFAULT_LINES: CartLinesValue = { lines: [], cartId: null };
const DEFAULT_META: CartMetaValue = {
    discountCodes: [],
    giftCards: [],
    buyerIdentity: null,
    note: null,
    attributes: [],
    checkoutUrl: null,
};
const DEFAULT_STATUS: CartStatusValue = { status: 'loading', error: null, cartReady: false };

const CartCountContext = createContext<CartCountValue>(0);
const CartLinesContext = createContext<CartLinesValue>(DEFAULT_LINES);
const CartCostContext = createContext<CartCostValue>(DEFAULT_COST);
const CartMetaContext = createContext<CartMetaValue>(DEFAULT_META);
const CartStatusContext = createContext<CartStatusValue>(DEFAULT_STATUS);
const CartActionsContext = createContext<CartActionsValue | null>(null);
const CartInternalContext = createContext<InternalApi | null>(null);

const cryptoRandomId = (): string =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function formatUserError(result: Extract<CartActionResult, { ok: false }>): string {
    return result.message || result.userErrors?.[0]?.message || 'Cart action failed.';
}

export const NordcomCartProvider = ({ children }: { children: ReactNode }) => {
    const [cart, setCartState] = useState<Cart | null>(null);
    const [status, setStatus] = useState<CartStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [, startTransition] = useTransition();
    const [optimisticCart, addOptimisticMutation] = useOptimistic<Cart | null, CartMutation>(cart, applyOptimistic);
    const seededRef = useRef(false);
    const [cartReady, setCartReady] = useState(false);
    const shopIdRef = useRef<string | null>(null);
    const [shopIdState, setShopIdState] = useState<string | null>(null);
    const broadcastRef = useRef<BroadcastChannel | null>(null);
    const cartIdRef = useRef<string | null>(null);

    useEffect(() => {
        cartIdRef.current = cart?.id ?? null;
    }, [cart?.id]);

    const setInitialCart = useCallback((next: Cart | null) => {
        if (seededRef.current) return;
        seededRef.current = true;
        setCartState(next);
        setCartReady(true);
        setStatus('idle');
    }, []);

    const replaceCart = useCallback((next: Cart) => {
        setCartState(next);
        setStatus('idle');
        setError(null);
    }, []);

    const setShopId = useCallback((id: string) => {
        shopIdRef.current = id;
        setShopIdState(id);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
        if (!shopIdState) return;
        const channel = new BroadcastChannel(`nordcom-cart:${shopIdState}`);
        channel.onmessage = (ev) => {
            const data = ev.data as { type?: string; cart?: Cart } | null;
            if (data?.type === 'cart-updated' && data.cart) {
                setCartState(data.cart);
            } else if (data?.type === 'cart-cleared') {
                setCartState(null);
                seededRef.current = false;
                setCartReady(false);
            }
        };
        broadcastRef.current = channel;
        return () => {
            channel.close();
            broadcastRef.current = null;
        };
    }, [shopIdState]);

    const runMutation = useCallback(
        (args: { mutation: CartMutation; action: () => Promise<CartActionResult> }): Promise<CartActionResult> => {
            return new Promise((resolve) => {
                startTransition(async () => {
                    addOptimisticMutation(args.mutation);
                    setStatus('mutating');
                    const result = await args.action();
                    if (result.ok) {
                        replaceCart(result.cart);
                        broadcastRef.current?.postMessage({ type: 'cart-updated', cart: result.cart });
                    } else {
                        setStatus('error');
                        setError(formatUserError(result));
                        if (result.cart) replaceCart(result.cart);
                    }
                    resolve(result);
                });
            });
        },
        [addOptimisticMutation, replaceCart],
    );

    const countValue = optimisticCart?.totalQuantity ?? 0;
    const linesValue = useMemo<CartLinesValue>(
        () => ({ lines: optimisticCart?.lines ?? [], cartId: optimisticCart?.id ?? null }),
        [optimisticCart?.lines, optimisticCart?.id],
    );
    const costValue = useMemo<CartCostValue>(
        () => ({
            subtotal: optimisticCart?.cost.subtotal ?? null,
            total: optimisticCart?.cost.total ?? null,
            tax: optimisticCart?.cost.tax ?? null,
            shipping: optimisticCart?.cost.shipping ?? null,
            stale: optimisticCart?.costStale ?? false,
        }),
        [optimisticCart?.cost, optimisticCart?.costStale],
    );
    const metaValue = useMemo<CartMetaValue>(
        () => ({
            discountCodes: optimisticCart?.discountCodes ?? [],
            giftCards: optimisticCart?.giftCards ?? [],
            buyerIdentity: optimisticCart?.buyerIdentity ?? null,
            note: optimisticCart?.note ?? null,
            attributes: optimisticCart?.attributes ?? [],
            checkoutUrl: optimisticCart?.checkoutUrl ?? null,
        }),
        [
            optimisticCart?.discountCodes,
            optimisticCart?.giftCards,
            optimisticCart?.buyerIdentity,
            optimisticCart?.note,
            optimisticCart?.attributes,
            optimisticCart?.checkoutUrl,
        ],
    );
    const statusValue = useMemo<CartStatusValue>(() => ({ status, error, cartReady }), [status, error, cartReady]);

    const actionsValue = useMemo<CartActionsValue>(
        () => ({
            addLine: (input) =>
                runMutation({
                    mutation: { kind: 'add-line', ...input, tempId: `temp:${cryptoRandomId()}` },
                    action: () => {
                        const fd = new FormData();
                        fd.set('variantId', input.variantId);
                        fd.set('quantity', String(input.quantity));
                        const id = cartIdRef.current;
                        if (id) fd.set('cartId', id);
                        if (input.attributes) fd.set('attributes', JSON.stringify(input.attributes));
                        return addToCartAction(fd);
                    },
                }),
            updateLine: ({ lineId, quantity }) =>
                runMutation({
                    mutation: { kind: 'update-line', lineId, quantity },
                    action: () => {
                        const fd = new FormData();
                        fd.set('lineId', lineId);
                        fd.set('quantity', String(quantity));
                        const id = cartIdRef.current;
                        if (id) fd.set('cartId', id);
                        return updateCartLineQuantityAction(fd);
                    },
                }),
            removeLine: (lineId) =>
                runMutation({
                    mutation: { kind: 'remove-line', lineId },
                    action: () => {
                        const fd = new FormData();
                        fd.set('lineId', lineId);
                        const id = cartIdRef.current;
                        if (id) fd.set('cartId', id);
                        return removeCartLineAction(fd);
                    },
                }),
            applyDiscountCode: (code) =>
                runMutation({
                    mutation: { kind: 'apply-discount', code },
                    action: () => {
                        const fd = new FormData();
                        fd.set('code', code);
                        const id = cartIdRef.current;
                        if (id) fd.set('cartId', id);
                        return applyDiscountCodeAction(fd);
                    },
                }),
            removeDiscountCode: (code) =>
                runMutation({
                    mutation: { kind: 'remove-discount', code },
                    action: () => {
                        const fd = new FormData();
                        fd.set('code', code);
                        const id = cartIdRef.current;
                        if (id) fd.set('cartId', id);
                        return removeDiscountCodeAction(fd);
                    },
                }),
            applyGiftCard: (code) =>
                runMutation({
                    mutation: { kind: 'apply-gift-card', code },
                    action: () => {
                        const fd = new FormData();
                        fd.set('code', code);
                        const id = cartIdRef.current;
                        if (id) fd.set('cartId', id);
                        return applyGiftCardAction(fd);
                    },
                }),
            removeGiftCard: (id) =>
                runMutation({
                    mutation: { kind: 'remove-gift-card', id },
                    action: () => {
                        const fd = new FormData();
                        fd.set('id', id);
                        const cartId = cartIdRef.current;
                        if (cartId) fd.set('cartId', cartId);
                        return removeGiftCardAction(fd);
                    },
                }),
            updateNote: (note) =>
                runMutation({
                    mutation: { kind: 'update-note', note },
                    action: () => {
                        const fd = new FormData();
                        fd.set('note', note);
                        const id = cartIdRef.current;
                        if (id) fd.set('cartId', id);
                        return updateNoteAction(fd);
                    },
                }),
            updateAttributes: (attrs) =>
                runMutation({
                    mutation: { kind: 'update-attributes', attributes: attrs },
                    action: () => {
                        const fd = new FormData();
                        fd.set('attributes', JSON.stringify(attrs));
                        const id = cartIdRef.current;
                        if (id) fd.set('cartId', id);
                        return updateAttributesAction(fd);
                    },
                }),
            updateBuyerIdentity: () => {
                void runMutation({
                    mutation: { kind: 'update-attributes', attributes: [] },
                    action: () => updateBuyerIdentityAction(new FormData()),
                });
            },
        }),
        [runMutation],
    );

    const internalValue = useMemo<InternalApi>(
        () => ({ setInitialCart, replaceCart, setShopId }),
        [setInitialCart, replaceCart, setShopId],
    );

    return (
        <CartActionsContext.Provider value={actionsValue}>
            <CartInternalContext.Provider value={internalValue}>
                <CartCountContext.Provider value={countValue}>
                    <CartLinesContext.Provider value={linesValue}>
                        <CartCostContext.Provider value={costValue}>
                            <CartMetaContext.Provider value={metaValue}>
                                <CartStatusContext.Provider value={statusValue}>
                                    <BuyerIdentitySync />
                                    {children}
                                </CartStatusContext.Provider>
                            </CartMetaContext.Provider>
                        </CartCostContext.Provider>
                    </CartLinesContext.Provider>
                </CartCountContext.Provider>
            </CartInternalContext.Provider>
        </CartActionsContext.Provider>
    );
};
NordcomCartProvider.displayName = 'Nordcom.CartProvider';

export function useCartCount(): number {
    return useContext(CartCountContext);
}

export function useCartLines(): CartLinesValue {
    return useContext(CartLinesContext);
}

export function useCartCost(): CartCostValue {
    return useContext(CartCostContext);
}

export function useCartMeta(): CartMetaValue {
    return useContext(CartMetaContext);
}

export function useCartStatus(): CartStatusValue {
    return useContext(CartStatusContext);
}

export function useCartActions(): CartActionsValue {
    const ctx = useContext(CartActionsContext);
    if (!ctx) throw new Error('useCartActions must be used inside <NordcomCartProvider>.');
    return ctx;
}

export type UseCartReturn = {
    cart: {
        id: string;
        totalQuantity: number;
        lines: CartLine[];
        cost: { subtotal: Money | null; total: Money | null; tax: Money | null; shipping: Money | null };
        costStale: boolean;
        discountCodes: Cart['discountCodes'];
        giftCards: Cart['giftCards'];
        buyerIdentity: Cart['buyerIdentity'];
        note: string | null;
        attributes: Cart['attributes'];
        checkoutUrl: string | null;
    } | null;
} & CartStatusValue &
    CartActionsValue;

function projectCart(
    actionsCtx: CartActionsValue,
    count: number,
    lines: CartLinesValue,
    cost: CartCostValue,
    meta: CartMetaValue,
    status: CartStatusValue,
): UseCartReturn {
    return {
        cart: lines.cartId
            ? {
                  id: lines.cartId,
                  totalQuantity: count,
                  lines: lines.lines,
                  cost: { subtotal: cost.subtotal, total: cost.total, tax: cost.tax, shipping: cost.shipping },
                  costStale: cost.stale,
                  discountCodes: meta.discountCodes,
                  giftCards: meta.giftCards,
                  buyerIdentity: meta.buyerIdentity,
                  note: meta.note,
                  attributes: meta.attributes,
                  checkoutUrl: meta.checkoutUrl,
              }
            : null,
        ...status,
        ...actionsCtx,
    };
}

/**
 * Convenience hook that combines all cart slices into the hydrogen-react-shaped
 * object. Subscribes to every slice — re-renders on any cart change. Prefer the
 * narrow slice hooks (useCartCount, useCartLines, etc.) where possible.
 */
export function useCart(): UseCartReturn {
    const actionsCtx = useContext(CartActionsContext);
    const count = useCartCount();
    const lines = useCartLines();
    const cost = useCartCost();
    const meta = useCartMeta();
    const status = useCartStatus();
    if (!actionsCtx) throw new Error('useCart must be used inside <NordcomCartProvider>.');
    return projectCart(actionsCtx, count, lines, cost, meta, status);
}

/**
 * Like useCart, but returns null when used outside the provider. Useful for
 * analytics and other opt-in consumers that may render before the provider mounts.
 */
export function useMaybeCart(): UseCartReturn | null {
    const actionsCtx = useContext(CartActionsContext);
    const count = useCartCount();
    const lines = useCartLines();
    const cost = useCartCost();
    const meta = useCartMeta();
    const status = useCartStatus();
    if (!actionsCtx) return null;
    return projectCart(actionsCtx, count, lines, cost, meta, status);
}

export function useNordcomCartInternal(): InternalApi {
    const ctx = useContext(CartInternalContext);
    if (!ctx) throw new Error('useNordcomCartInternal must be used inside <NordcomCartProvider>.');
    return ctx;
}
