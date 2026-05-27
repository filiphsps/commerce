import type { CartActionResult, CartCapabilities, CartExt, KV, NewCartLine, ProductSnapshot } from '@nordcom/cart-core';

export type BaseCartActions<TExt extends CartExt = {}> = {
    addLine(input: NewCartLine & { snapshot?: ProductSnapshot }): Promise<CartActionResult<TExt>>;
    updateLine(input: { lineId: string; quantity: number }): Promise<CartActionResult<TExt>>;
    removeLine(lineId: string): Promise<CartActionResult<TExt>>;
};

export type GiftCardActions<TExt extends CartExt = {}> = {
    applyGiftCard(code: string): Promise<CartActionResult<TExt>>;
    removeGiftCard(id: string): Promise<CartActionResult<TExt>>;
};

export type DiscountActions<TExt extends CartExt = {}> = {
    applyDiscountCode(code: string): Promise<CartActionResult<TExt>>;
    removeDiscountCode(code: string): Promise<CartActionResult<TExt>>;
};

export type NoteActions<TExt extends CartExt = {}> = {
    updateNote(note: string): Promise<CartActionResult<TExt>>;
};

export type CartAttributeActions<TExt extends CartExt = {}> = {
    updateAttributes(attributes: KV[]): Promise<CartActionResult<TExt>>;
};

export type BuyerIdentityActions<TExt extends CartExt = {}> = {
    updateBuyerIdentity(): Promise<CartActionResult<TExt>>;
};

export type CartActions<C extends CartCapabilities, TExt extends CartExt = {}> = BaseCartActions<TExt> &
    (C['giftCards'] extends true ? GiftCardActions<TExt> : Record<never, never>) &
    (C['multipleDiscountCodes'] extends true ? DiscountActions<TExt> : Record<never, never>) &
    (C['notes'] extends true ? NoteActions<TExt> : Record<never, never>) &
    (C['cartAttributes'] extends true ? CartAttributeActions<TExt> : Record<never, never>) &
    (C['buyerIdentity'] extends true ? BuyerIdentityActions<TExt> : Record<never, never>);
