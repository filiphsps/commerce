import type { AdapterCtx, BuyerIdentity, Cart, CartExt, KV, NewCartLine } from './types';

/**
 * Feature flags advertised by every {@link CartAdapter}. The kernel checks
 * these before calling optional adapter methods, allowing hosts to also branch
 * on capabilities without probing method presence at runtime.
 *
 * @example
 * ```ts
 * if (kernel.capabilities.giftCards) {
 *   await kernel.mutate(ctx, { kind: 'apply-gift-card', code: 'GIFT123' });
 * }
 * ```
 */
export type CartCapabilities = {
    giftCards: boolean;
    multipleDiscountCodes: boolean;
    buyerIdentity: boolean;
    notes: boolean;
    cartAttributes: boolean;
    lineAttributes: boolean;
    customMutations: readonly string[];
};

/**
 * Handler registered on a {@link CartAdapter} for a named custom mutation —
 * an operation with no first-class kernel method. Every name declared in
 * `CartCapabilities.customMutations` must map to a handler of this type.
 *
 * @param ctx - Adapter context threaded from the kernel dispatch.
 * @param args.cartId - Cart to mutate.
 * @param args.payload - Arbitrary mutation payload; its shape is
 *   handler-defined and opaque to the kernel.
 * @returns The updated cart after the custom operation completes.
 * @example
 * ```ts
 * const handler: CustomMutationHandler = async (ctx, { cartId, payload }) => {
 *   const lines = (payload as { variantId: string }[]).map((v) => ({ ...v, quantity: 1 }));
 *   return myAdapter.addLines(ctx, { cartId, lines });
 * };
 * ```
 */
export type CustomMutationHandler<TExt extends CartExt = {}> = (
    ctx: AdapterCtx,
    args: { cartId: string; payload: unknown },
) => Promise<Cart<TExt>>;

/**
 * Contract that every cart provider implementation satisfies. Adapters expose
 * required CRUD operations and declare their optional capabilities so the kernel
 * can gate advanced mutations without probing method presence.
 *
 * @example
 * ```ts
 * class ShopifyAdapter implements CartAdapter {
 *   readonly type = 'shopify';
 *   readonly capabilities: CartCapabilities = {
 *     giftCards: true, multipleDiscountCodes: true,
 *     buyerIdentity: true, notes: true, cartAttributes: true,
 *     lineAttributes: true, customMutations: [],
 *   };
 *   async getCart(ctx, { cartId }) { ... }
 *   async createCart(ctx, args) { ... }
 *   async addLines(ctx, args) { ... }
 *   async updateLines(ctx, args) { ... }
 *   async removeLines(ctx, args) { ... }
 * }
 * ```
 */
export interface CartAdapter<TExt extends CartExt = {}> {
    readonly type: string;
    readonly capabilities: CartCapabilities;

    getCart(ctx: AdapterCtx, args: { cartId: string }): Promise<Cart<TExt> | null>;
    createCart(ctx: AdapterCtx, args: { lines?: NewCartLine[]; buyerIdentity?: BuyerIdentity }): Promise<Cart<TExt>>;
    addLines(ctx: AdapterCtx, args: { cartId: string; lines: NewCartLine[] }): Promise<Cart<TExt>>;
    updateLines(
        ctx: AdapterCtx,
        args: { cartId: string; lines: Array<{ id: string; quantity: number }> },
    ): Promise<Cart<TExt>>;
    removeLines(ctx: AdapterCtx, args: { cartId: string; lineIds: string[] }): Promise<Cart<TExt>>;

    applyDiscountCodes?(ctx: AdapterCtx, args: { cartId: string; codes: string[] }): Promise<Cart<TExt>>;
    applyGiftCardCodes?(ctx: AdapterCtx, args: { cartId: string; codes: string[] }): Promise<Cart<TExt>>;
    removeGiftCardCodes?(ctx: AdapterCtx, args: { cartId: string; ids: string[] }): Promise<Cart<TExt>>;
    updateBuyerIdentity?(ctx: AdapterCtx, args: { cartId: string; buyerIdentity: BuyerIdentity }): Promise<Cart<TExt>>;
    updateNote?(ctx: AdapterCtx, args: { cartId: string; note: string }): Promise<Cart<TExt>>;
    updateAttributes?(ctx: AdapterCtx, args: { cartId: string; attributes: KV[] }): Promise<Cart<TExt>>;

    customMutations?: Record<string, CustomMutationHandler<TExt>>;
}
