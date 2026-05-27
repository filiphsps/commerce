import { describe, expect, it } from 'vitest';
import { cachePredictor, snapshotPredictor } from '../src/predictors/line';

const ctx = {
    confirmed: null,
    projection: { cost: { subtotal: { amount: '0', currencyCode: 'USD' } } } as never,
    pending: [],
};

describe('snapshotPredictor', () => {
    it('returns the synthesized line shape when mutation.snapshot is set', () => {
        const result = snapshotPredictor()(
            {
                kind: 'add-line',
                variantId: 'v',
                quantity: 2,
                snapshot: {
                    variantId: 'v',
                    productHandle: 'h',
                    productTitle: 'Title',
                    variantTitle: 'Variant',
                    image: null,
                    unitPrice: { amount: '9.99', currencyCode: 'USD' },
                },
            },
            ctx as never,
        );
        expect(result?.merchandise?.productTitle).toBe('Title');
        expect(result?.merchandise?.unitPrice.amount).toBe('9.99');
        expect(result?.quantity).toBe(2);
    });

    it('returns null when mutation has no snapshot', () => {
        const result = snapshotPredictor()({ kind: 'add-line', variantId: 'v', quantity: 1 }, ctx as never);
        expect(result).toBeNull();
    });

    it('returns null for non-add-line mutations', () => {
        const result = snapshotPredictor()({ kind: 'update-line', lineId: 'l', quantity: 2 }, ctx as never);
        expect(result).toBeNull();
    });
});

describe('cachePredictor', () => {
    it('reads merchandise from the supplied KV getter', () => {
        const get = (id: string) =>
            id === 'v'
                ? {
                      productHandle: 'cache-h',
                      productTitle: 'Cache title',
                      unitPrice: { amount: '1.00', currencyCode: 'USD' },
                  }
                : null;
        const result = cachePredictor({ get })({ kind: 'add-line', variantId: 'v', quantity: 1 }, ctx as never);
        expect(result?.merchandise?.productTitle).toBe('Cache title');
    });

    it('returns null on cache miss', () => {
        const result = cachePredictor({ get: () => null })(
            { kind: 'add-line', variantId: 'v', quantity: 1 },
            ctx as never,
        );
        expect(result).toBeNull();
    });
});
