import type { Cart } from '@nordcom/cart-core';
import { describe, expect, it } from 'vitest';
import { quantitySumPredictor, subtotalPredictor } from '../src/predictors/cart';
import { snapshotPredictor } from '../src/predictors/line';
import { project } from '../src/projection';

function empty(): Cart {
    return {
        id: 'c1',
        providerType: 'mock',
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
        updatedAt: '2026',
        custom: {},
    };
}

describe('project', () => {
    it('returns confirmed when no pending', () => {
        const confirmed = empty();
        const out = project({ confirmed, pending: [], linePredictors: [], cartPredictors: [] });
        expect(out).toBe(confirmed);
    });

    it('applies add-line + cart predictors in order', () => {
        const out = project({
            confirmed: empty(),
            pending: [
                {
                    id: 'a',
                    status: 'predicted',
                    startedAt: 0,
                    tempLineId: 'temp:line-1',
                    mutation: {
                        kind: 'add-line',
                        variantId: 'v',
                        quantity: 2,
                        snapshot: {
                            variantId: 'v',
                            productHandle: 'h',
                            productTitle: 'T',
                            variantTitle: 'V',
                            image: null,
                            unitPrice: { amount: '5.00', currencyCode: 'USD' },
                        },
                    },
                },
            ],
            linePredictors: [snapshotPredictor()],
            cartPredictors: [quantitySumPredictor(), subtotalPredictor()],
        });
        expect(out.lines).toHaveLength(1);
        expect(out.lines[0]?.id).toBe('temp:line-1');
        expect(out.totalQuantity).toBe(2);
        expect(out.cost.subtotal.amount).toBe('10.00');
        expect(out.costStale).toBe(true);
    });

    it('skips failed pending', () => {
        const out = project({
            confirmed: empty(),
            pending: [
                {
                    id: 'x',
                    status: 'failed',
                    startedAt: 0,
                    error: 'nope',
                    mutation: { kind: 'add-line', variantId: 'v', quantity: 1 },
                },
            ],
            linePredictors: [snapshotPredictor()],
            cartPredictors: [],
        });
        expect(out.lines).toHaveLength(0);
    });
});
