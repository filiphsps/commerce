import type { Cart } from '@nordcom/cart-core';
import { describe, expect, it } from 'vitest';
import { quantitySumPredictor, subtotalPredictor } from '../src/predictors/cart';

function cartWithLines(qty: number, unit: string): Cart {
    return {
        id: 'c1',
        providerType: 'mock',
        totalQuantity: 0,
        checkoutUrl: null,
        lines: [
            {
                id: 'l1',
                quantity: qty,
                merchandise: { unitPrice: { amount: unit, currencyCode: 'USD' } } as never,
                cost: {
                    subtotal: { amount: '0', currencyCode: 'USD' },
                    total: { amount: '0', currencyCode: 'USD' },
                },
                attributes: [],
                discountAllocations: [],
                custom: {},
            },
        ],
        cost: {
            subtotal: { amount: '0', currencyCode: 'USD' },
            total: null,
            tax: null,
            shipping: null,
        },
        costStale: true,
        discountCodes: [],
        giftCards: [],
        buyerIdentity: null,
        note: null,
        attributes: [],
        updatedAt: '2026',
        custom: {},
    };
}

describe('quantitySumPredictor', () => {
    it('recomputes totalQuantity from lines', () => {
        const out = quantitySumPredictor()(
            cartWithLines(3, '0'),
            { kind: 'add-line', variantId: 'v', quantity: 3 },
            { confirmed: null, projection: cartWithLines(3, '0'), pending: [] },
        );
        expect(out.totalQuantity).toBe(3);
    });
});

describe('subtotalPredictor', () => {
    it('sums unitPrice × quantity into subtotal, marks costStale=true', () => {
        const c = cartWithLines(2, '4.50');
        const out = subtotalPredictor()(
            c,
            { kind: 'add-line', variantId: 'v', quantity: 2 },
            { confirmed: null, projection: c, pending: [] },
        );
        expect(out.cost.subtotal).toEqual({ amount: '9.00', currencyCode: 'USD' });
        expect(out.costStale).toBe(true);
    });
});
