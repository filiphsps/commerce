import { describe, expect, it } from 'vitest';

import { resolveFreeShipping } from './free-shipping';

const thresholds = [
    { currencyCode: 'USD', amount: 75 },
    { currencyCode: 'EUR', amount: 70 },
];

describe('resolveFreeShipping', () => {
    it('returns none when no thresholds are configured', () => {
        expect(resolveFreeShipping({ thresholds: undefined, currencyCode: 'USD', subtotal: 50 })).toEqual({
            state: 'none',
        });
        expect(resolveFreeShipping({ thresholds: [], currencyCode: 'USD', subtotal: 50 })).toEqual({ state: 'none' });
    });

    it('returns none when no threshold matches the cart currency', () => {
        expect(resolveFreeShipping({ thresholds, currencyCode: 'SEK', subtotal: 500 })).toEqual({ state: 'none' });
    });

    it('returns none for an empty cart (subtotal <= 0)', () => {
        expect(resolveFreeShipping({ thresholds, currencyCode: 'USD', subtotal: 0 })).toEqual({ state: 'none' });
    });

    it('matches the threshold currency case-insensitively', () => {
        expect(resolveFreeShipping({ thresholds, currencyCode: 'usd', subtotal: 50 })).toEqual({
            state: 'progress',
            threshold: 75,
            remaining: 25,
        });
    });

    it('reports remaining amount while below the threshold', () => {
        expect(resolveFreeShipping({ thresholds, currencyCode: 'EUR', subtotal: 40 })).toEqual({
            state: 'progress',
            threshold: 70,
            remaining: 30,
        });
    });

    it('unlocks exactly at the threshold (subtotal === amount)', () => {
        expect(resolveFreeShipping({ thresholds, currencyCode: 'USD', subtotal: 75 })).toEqual({
            state: 'unlocked',
            threshold: 75,
            remaining: 0,
        });
    });

    it('unlocks above the threshold', () => {
        expect(resolveFreeShipping({ thresholds, currencyCode: 'USD', subtotal: 120 })).toEqual({
            state: 'unlocked',
            threshold: 75,
            remaining: 0,
        });
    });
});
