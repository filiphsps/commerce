/**
 * Client-safe literal-typed cart capability matrix for the storefront. The
 * Shopify adapter advertises every cart-core capability as `true`, so the
 * literal-true shape narrows `useCartActions<C>()` to expose every action
 * method (gift cards, discounts, notes, attributes, buyer identity) on the
 * returned object.
 *
 * Kept separate from `kernel.ts` because the kernel module is `server-only`
 * — client consumers must not pull it in, but still need the capability
 * shape to narrow hooks.
 */
export type AppCartCaps = {
    giftCards: true;
    multipleDiscountCodes: true;
    buyerIdentity: true;
    notes: true;
    cartAttributes: true;
    lineAttributes: true;
    customMutations: readonly string[];
};
