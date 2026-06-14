/** A per-currency free-shipping messaging threshold from `shop.commerce.freeShippingThresholds`. */
export type FreeShippingThreshold = {
    currencyCode: string;
    amount: number;
};

/**
 * Resolved free-shipping messaging state for the current cart. `none` means no
 * banner renders (no matching threshold, or an empty cart); `progress` carries
 * how much more the shopper needs; `unlocked` means the subtotal cleared the bar.
 */
export type FreeShippingState =
    | { state: 'none' }
    | { state: 'progress'; threshold: number; remaining: number }
    | { state: 'unlocked'; threshold: number; remaining: 0 };

/**
 * Resolves the free-shipping messaging state for a cart. This is storefront
 * messaging only — Shopify computes real shipping at checkout. A threshold
 * applies only when its `currencyCode` matches the cart's presentment currency;
 * no FX conversion is performed.
 *
 * @param input - Resolver inputs.
 * @param input.thresholds - The shop's per-currency thresholds, if configured.
 * @param input.currencyCode - The cart's presentment currency code.
 * @param input.subtotal - The cart subtotal in `currencyCode`.
 * @returns The `none`, `progress`, or `unlocked` state for the banner.
 */
export function resolveFreeShipping({
    thresholds,
    currencyCode,
    subtotal,
}: {
    thresholds: FreeShippingThreshold[] | undefined;
    currencyCode: string;
    subtotal: number;
}): FreeShippingState {
    if (!thresholds || thresholds.length <= 0 || subtotal <= 0) {
        return { state: 'none' };
    }

    const target = currencyCode.toUpperCase();
    const match = thresholds.find((threshold) => threshold.currencyCode.toUpperCase() === target);
    if (!match || !(match.amount > 0)) {
        return { state: 'none' };
    }

    if (subtotal >= match.amount) {
        return { state: 'unlocked', threshold: match.amount, remaining: 0 };
    }

    return { state: 'progress', threshold: match.amount, remaining: match.amount - subtotal };
}
