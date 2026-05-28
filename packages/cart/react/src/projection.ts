import type { Cart, CartLine, CartMutation } from '@nordcom/cart-core';
import type { CartPredictor, LinePredictor, PendingMutation } from './types';

export interface ProjectOpts {
    confirmed: Cart | null;
    pending: PendingMutation[];
    linePredictors: LinePredictor[];
    cartPredictors: CartPredictor[];
}

/**
 * Build a bare placeholder line used as the seed for `add-line` predictions
 * before any line predictor narrows it down. Keeps the shape conformant to
 * {@link CartLine} so downstream cart predictors and UI consumers can run
 * against a fully-typed value.
 *
 * @param tempId - Temp id to assign as the line's `id`.
 * @param variantId - Variant id the future server line will resolve to.
 * @param quantity - Quantity carried on the source `add-line` mutation.
 * @param currency - Currency code copied from the cart subtotal.
 * @returns A {@link CartLine} placeholder with empty/zero merchandise data.
 */
function emptyPlaceholderLine(tempId: string, variantId: string, quantity: number, currency: string): CartLine {
    return {
        id: tempId,
        quantity,
        merchandise: {
            id: variantId,
            productId: '',
            productHandle: '',
            productTitle: '',
            productVendor: null,
            productType: null,
            variantTitle: '',
            image: null,
            selectedOptions: [],
            unitPrice: { amount: '0', currencyCode: currency },
            compareAtUnitPrice: null,
            availableForSale: true,
            quantityAvailable: null,
            sku: null,
        },
        cost: {
            subtotal: { amount: '0', currencyCode: currency },
            total: { amount: '0', currencyCode: currency },
        },
        attributes: [],
        discountAllocations: [],
        custom: {},
    };
}

/**
 * Apply a single pending mutation to a cart projection. Add-line consults the
 * supplied line predictors and falls back to a placeholder; other mutations
 * project their structural intent (quantity change, line removal) and mark the
 * cart cost-stale so downstream consumers know totals are predicted.
 *
 * @param cart - Current projection accumulator.
 * @param mutation - Pending mutation to apply.
 * @param tempLineId - Temp id assigned to the predicted add-line, if any.
 * @param linePredictors - Ordered line predictors; first non-null wins.
 * @param confirmed - The confirmed cart at projection start (predictor ctx).
 * @param pending - The full pending queue (predictor ctx).
 * @returns The next projection.
 */
function applyMutation(
    cart: Cart,
    mutation: CartMutation,
    tempLineId: string | undefined,
    linePredictors: LinePredictor[],
    confirmed: Cart | null,
    pending: PendingMutation[],
): Cart {
    const currency = cart.cost.subtotal.currencyCode;
    const ctx = { confirmed, projection: cart, pending };
    switch (mutation.kind) {
        case 'add-line': {
            let predictedLine: Partial<CartLine> | null = null;
            for (const p of linePredictors) {
                const r = p(mutation, ctx);
                if (r) {
                    predictedLine = r as Partial<CartLine>;
                    break;
                }
            }
            const base = emptyPlaceholderLine(
                tempLineId ?? `temp:${Date.now()}`,
                mutation.variantId,
                mutation.quantity,
                currency,
            );
            const line: CartLine = predictedLine
                ? ({ ...base, ...predictedLine, id: base.id, custom: base.custom } as CartLine)
                : base;
            return { ...cart, lines: [...cart.lines, line], costStale: true };
        }
        case 'update-line': {
            return {
                ...cart,
                lines: cart.lines
                    .map((l) => (l.id === mutation.lineId ? { ...l, quantity: mutation.quantity } : l))
                    .filter((l) => l.quantity > 0),
                costStale: true,
            };
        }
        case 'remove-line':
            return {
                ...cart,
                lines: cart.lines.filter((l) => l.id !== mutation.lineId),
                costStale: true,
            };
        case 'clear':
            return { ...cart, lines: [], costStale: true };
        case 'apply-discount':
        case 'remove-discount':
        case 'apply-gift-card':
        case 'remove-gift-card':
        case 'update-note':
        case 'update-attributes':
        case 'update-buyer-identity':
        case 'custom':
            return { ...cart, costStale: true };
    }
}

/**
 * Fold predicted + in-flight mutations onto the confirmed cart, producing the
 * projection consumers render against. Failed mutations are skipped so they
 * don't pollute UI until explicitly cleared. With no confirmed cart, returns
 * a synthetic empty cart so consumers can render shells without conditionals.
 *
 * @param opts - Confirmed cart, pending queue, and predictor chains.
 * @returns A projected cart; identity-equal to `opts.confirmed` when no
 *   active pending mutations exist.
 */
export function project(opts: ProjectOpts): Cart {
    if (!opts.confirmed) {
        return {
            id: 'temp:cart',
            providerType: 'unknown',
            totalQuantity: 0,
            checkoutUrl: null,
            lines: [],
            cost: {
                subtotal: { amount: '0', currencyCode: 'USD' },
                total: null,
                tax: null,
                shipping: null,
            },
            costStale: false,
            discountCodes: [],
            giftCards: [],
            buyerIdentity: null,
            note: null,
            attributes: [],
            updatedAt: new Date().toISOString(),
            custom: {},
        };
    }
    const active = opts.pending.filter((p) => p.status !== 'failed');
    if (active.length === 0) return opts.confirmed;
    let cart: Cart = opts.confirmed;
    for (const p of active) {
        cart = applyMutation(cart, p.mutation, p.tempLineId, opts.linePredictors, opts.confirmed, opts.pending);
        for (const cp of opts.cartPredictors) {
            cart = cp(cart, p.mutation, { confirmed: opts.confirmed, projection: cart, pending: opts.pending });
        }
    }
    return cart;
}
