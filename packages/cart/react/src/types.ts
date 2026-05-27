import type { BuyerIdentity, Cart, CartCapabilities, CartExt, CartLine, CartMutation } from '@nordcom/cart-core';

export type CartStatus = 'idle' | 'loading' | 'mutating' | 'error';

/**
 * A single mutation in flight through the optimistic queue — from when it is
 * first predicted through server confirmation or failure. `status` and `error`
 * are the fields consumers typically use to show per-line loading spinners or
 * inline error messages.
 *
 * @example
 * ```ts
 * const pending = useCartPending(lineId);
 * if (pending && pending.status === 'in-flight') {
 *   showSpinner();
 * }
 * ```
 */
export type PendingMutation = {
    id: string;
    mutation: CartMutation;
    status: 'predicted' | 'in-flight' | 'failed';
    error?: string;
    startedAt: number;
    tempLineId?: string;
};

/**
 * Minimal React hook contract that exposes buyer identity to {@link CartProvider}
 * without coupling the cart to a specific auth library. Implement this interface
 * in the host app and pass it via `CartProviderProps.clientAuthBridge`.
 *
 * @example
 * ```ts
 * const bridge: ClientAuthBridge = {
 *   useBuyerIdentity() {
 *     const { user } = useAuth();
 *     return { identity: user ? { email: user.email } : null, updatedAt: user?.updatedAt ?? 0 };
 *   },
 * };
 * ```
 */
export type ClientAuthBridge = {
    useBuyerIdentity(): { identity: BuyerIdentity | null; updatedAt: number };
};

/**
 * Static capabilities snapshot produced by the cart adapter and passed from
 * the server to the client via `CartProviderProps.kernelSnapshot`. Drives which
 * optional action groups {@link CartProvider} builds into its action surface.
 *
 * @typeParam C - Capability matrix; defaults to the base {@link CartCapabilities} shape.
 * @example
 * ```ts
 * const snapshot: KernelSnapshot = {
 *   type: 'shopify',
 *   capabilities: { giftCards: true, notes: false, multipleDiscountCodes: true, cartAttributes: false, buyerIdentity: true },
 *   customMutationNames: [],
 * };
 * ```
 */
export type KernelSnapshot<C extends CartCapabilities = CartCapabilities> = {
    type: string;
    capabilities: C;
    customMutationNames: readonly string[];
};

/**
 * Contextual snapshot passed to every {@link LinePredictor} and
 * {@link CartPredictor} invocation. Predictors use these fields to implement
 * delta-aware projections that compare confirmed versus current projected state.
 *
 * @typeParam TExt - Cart extension shape.
 * @example
 * ```ts
 * const myLinePredictor: LinePredictor = (mutation, ctx) => {
 *   const confirmedCount = ctx.confirmed?.totalQuantity ?? 0;
 *   return null; // fall through to the next predictor
 * };
 * ```
 */
export type PredictorCtx<TExt extends CartExt = {}> = {
    confirmed: Cart<TExt> | null;
    projection: Cart<TExt>;
    pending: PendingMutation[];
};

/**
 * A function that optimistically projects a single cart line given a pending
 * mutation. Called once per `add-line` mutation by the projection engine; return
 * a partial line to override the blank placeholder, or `null` to fall through to
 * the next predictor in the chain.
 *
 * @typeParam TExt - Cart extension shape.
 * @example
 * ```ts
 * const predictors = {
 *   line: [snapshotPredictor(), cachePredictor({ get: cache.get })],
 * };
 * ```
 */
export type LinePredictor<TExt extends CartExt = {}> = (
    mutation: CartMutation,
    ctx: PredictorCtx<TExt>,
) => Partial<CartLine<TExt['line']>> | null;

/**
 * A function that projects the entire cart after a pending mutation has been
 * applied to the lines. Use it to recompute cart-level aggregates — such as
 * total quantity or subtotal — that depend on the mutated line set.
 *
 * @typeParam TExt - Cart extension shape.
 * @example
 * ```ts
 * const predictors = {
 *   cart: [quantitySumPredictor(), subtotalPredictor()],
 * };
 * ```
 */
export type CartPredictor<TExt extends CartExt = {}> = (
    projection: Cart<TExt>,
    mutation: CartMutation,
    ctx: PredictorCtx<TExt>,
) => Cart<TExt>;

/**
 * Compile-time pairing of a capability matrix and an extension shape used to
 * thread consistent type parameters through {@link CartProvider} and its
 * associated hooks. Define one per app and pass it as the generic argument to
 * {@link CartProvider} and the action hooks.
 *
 * @typeParam C - Capability matrix; must match the kernel snapshot's `capabilities`.
 * @typeParam E - Cart extension shape for any custom line or cart fields.
 * @example
 * ```ts
 * type MyCartConfig = AppCartConfig<CartCapabilities, { line: { customData: string } }>;
 * ```
 */
export type AppCartConfig<C extends CartCapabilities = CartCapabilities, E extends CartExt = {}> = {
    caps: C;
    ext: E;
};
