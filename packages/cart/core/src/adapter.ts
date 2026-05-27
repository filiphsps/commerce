import type { AdapterCtx, BuyerIdentity, Cart, CartExt, KV, NewCartLine } from './types';

export type CartCapabilities = {
    giftCards: boolean;
    multipleDiscountCodes: boolean;
    buyerIdentity: boolean;
    notes: boolean;
    cartAttributes: boolean;
    lineAttributes: boolean;
    customMutations: readonly string[];
};

export type CustomMutationHandler<TExt extends CartExt = {}> = (
    ctx: AdapterCtx,
    args: { cartId: string; payload: unknown },
) => Promise<Cart<TExt>>;

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
