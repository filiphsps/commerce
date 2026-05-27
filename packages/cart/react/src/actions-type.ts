import type { CartActionResult, CartCapabilities, CartExt, KV, NewCartLine, ProductSnapshot } from '@nordcom/cart-core';

/**
 * Minimum mutation surface every cart adapter must implement: add, update, and
 * remove cart lines. Serves as the base constraint for {@link CartActions} and can
 * be used directly when only the three core mutations are needed.
 *
 * @typeParam TExt - Cart extension shape; widens the {@link CartActionResult} each method returns.
 * @example
 * ```ts
 * function addItem<TExt extends CartExt>(actions: BaseCartActions<TExt>, line: NewCartLine) {
 *   return actions.addLine(line);
 * }
 * ```
 */
export type BaseCartActions<TExt extends CartExt = {}> = {
    addLine(input: NewCartLine & { snapshot?: ProductSnapshot }): Promise<CartActionResult<TExt>>;
    updateLine(input: { lineId: string; quantity: number }): Promise<CartActionResult<TExt>>;
    removeLine(lineId: string): Promise<CartActionResult<TExt>>;
};

/**
 * Gift-card mutation methods added to {@link CartActions} when
 * `CartCapabilities.giftCards` is `true`. Apply or remove a gift card by its
 * redemption code or server-issued id.
 *
 * @typeParam TExt - Cart extension shape; widens the {@link CartActionResult} each method returns.
 * @example
 * ```ts
 * const actions = useCartActions<CartCapabilities>();
 * await actions.applyGiftCard('GIFTCARD123');
 * ```
 */
export type GiftCardActions<TExt extends CartExt = {}> = {
    applyGiftCard(code: string): Promise<CartActionResult<TExt>>;
    removeGiftCard(id: string): Promise<CartActionResult<TExt>>;
};

/**
 * Discount-code mutation methods added to {@link CartActions} when
 * `CartCapabilities.multipleDiscountCodes` is `true`. Apply or remove a
 * discount code by its string value.
 *
 * @typeParam TExt - Cart extension shape; widens the {@link CartActionResult} each method returns.
 * @example
 * ```ts
 * const actions = useCartActions<CartCapabilities>();
 * await actions.applyDiscountCode('SAVE10');
 * ```
 */
export type DiscountActions<TExt extends CartExt = {}> = {
    applyDiscountCode(code: string): Promise<CartActionResult<TExt>>;
    removeDiscountCode(code: string): Promise<CartActionResult<TExt>>;
};

/**
 * Cart-note mutation method added to {@link CartActions} when
 * `CartCapabilities.notes` is `true`. Replaces the entire cart note with a
 * new string; pass an empty string to clear.
 *
 * @typeParam TExt - Cart extension shape; widens the {@link CartActionResult} each method returns.
 * @example
 * ```ts
 * const actions = useCartActions<CartCapabilities>();
 * await actions.updateNote('Please gift wrap this order.');
 * ```
 */
export type NoteActions<TExt extends CartExt = {}> = {
    updateNote(note: string): Promise<CartActionResult<TExt>>;
};

/**
 * Cart-attribute mutation method added to {@link CartActions} when
 * `CartCapabilities.cartAttributes` is `true`. Replaces all cart attributes
 * atomically with the supplied key-value pairs.
 *
 * @typeParam TExt - Cart extension shape; widens the {@link CartActionResult} each method returns.
 * @example
 * ```ts
 * const actions = useCartActions<CartCapabilities>();
 * await actions.updateAttributes([{ key: 'source', value: 'homepage' }]);
 * ```
 */
export type CartAttributeActions<TExt extends CartExt = {}> = {
    updateAttributes(attributes: KV[]): Promise<CartActionResult<TExt>>;
};

/**
 * Buyer-identity sync method added to {@link CartActions} when
 * `CartCapabilities.buyerIdentity` is `true`. Fires when the auth bridge
 * detects a changed identity so the adapter can associate the cart with
 * the authenticated user on the server.
 *
 * @typeParam TExt - Cart extension shape; widens the {@link CartActionResult} each method returns.
 * @example
 * ```ts
 * const actions = useCartActions<CartCapabilities>();
 * await actions.updateBuyerIdentity();
 * ```
 */
export type BuyerIdentityActions<TExt extends CartExt = {}> = {
    updateBuyerIdentity(): Promise<CartActionResult<TExt>>;
};

/**
 * Full action surface for a cart, assembled from {@link BaseCartActions} and
 * capability-gated mixin types. Pass the same `C` as the kernel snapshot's
 * `capabilities` to receive a correctly narrowed object from {@link useCartActions}.
 *
 * @typeParam C - Capability matrix from the kernel snapshot; drives which optional action groups are included.
 * @typeParam TExt - Cart extension shape; widens each method's {@link CartActionResult}.
 * @example
 * ```ts
 * const actions = useCartActions<CartCapabilities>();
 * await actions.addLine({ variantId: 'gid://shopify/ProductVariant/123', quantity: 1 });
 * ```
 */
export type CartActions<C extends CartCapabilities, TExt extends CartExt = {}> = BaseCartActions<TExt> &
    (C['giftCards'] extends true ? GiftCardActions<TExt> : Record<never, never>) &
    (C['multipleDiscountCodes'] extends true ? DiscountActions<TExt> : Record<never, never>) &
    (C['notes'] extends true ? NoteActions<TExt> : Record<never, never>) &
    (C['cartAttributes'] extends true ? CartAttributeActions<TExt> : Record<never, never>) &
    (C['buyerIdentity'] extends true ? BuyerIdentityActions<TExt> : Record<never, never>);
