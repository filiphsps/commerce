import { money } from '@nordcom/cart-core';
import type { CartPredictor } from '../types';

/**
 * Build a cart-level predictor that recomputes `totalQuantity` as the sum of
 * each line's quantity. Pair with line predictors that add or update lines so
 * the cart badge stays in sync during optimistic updates.
 *
 * @returns A {@link CartPredictor} that returns a new cart with the refreshed
 *   `totalQuantity` and all other fields unchanged.
 */
export function quantitySumPredictor(): CartPredictor {
    return (cart) => ({
        ...cart,
        totalQuantity: cart.lines.reduce((sum, l) => sum + l.quantity, 0),
    });
}

/**
 * Build a cart-level predictor that recomputes `cost.subtotal` from line
 * unit prices times quantities. Marks `costStale: true` so consumers can grey
 * out totals until the server confirms — unit-price-only math intentionally
 * ignores discounts, taxes, and shipping.
 *
 * @returns A {@link CartPredictor} producing a cart with the new subtotal and
 *   `costStale: true`.
 * @throws Error when any line's `unitPrice.currencyCode` differs from the
 *   cart subtotal currency (delegated to {@link money.add}).
 */
export function subtotalPredictor(): CartPredictor {
    return (cart) => {
        const cc = cart.cost.subtotal.currencyCode;
        const total = cart.lines.reduce((acc, l) => {
            return money.add(acc, money.mul(money.parse(l.merchandise.unitPrice), l.quantity));
        }, money.zero(cc));
        return {
            ...cart,
            cost: { ...cart.cost, subtotal: money.format(total) },
            costStale: true,
        };
    };
}
