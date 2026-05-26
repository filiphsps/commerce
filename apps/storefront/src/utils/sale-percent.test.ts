import { describe, expect, it } from 'vitest';
import type { ProductVariant } from '@/api/product';
import { computeSalePercent, isVariantOnSale } from './sale-percent';

const v = (price: string, compare?: string): ProductVariant =>
    ({
        price: { amount: price, currencyCode: 'USD' },
        compareAtPrice: compare ? { amount: compare, currencyCode: 'USD' } : null,
    }) as ProductVariant;

describe('utils', () => {
    describe('isVariantOnSale', () => {
        it('returns false when compareAtPrice is missing', () => {
            expect(isVariantOnSale(v('10'))).toBe(false);
        });

        it('returns false when compareAtPrice equals price', () => {
            expect(isVariantOnSale(v('10', '10'))).toBe(false);
        });

        it('returns false when compareAtPrice is lower than price', () => {
            expect(isVariantOnSale(v('15', '10'))).toBe(false);
        });

        it('returns true when compareAtPrice is strictly higher than price', () => {
            expect(isVariantOnSale(v('10', '15'))).toBe(true);
        });

        it('returns false for null / undefined input', () => {
            expect(isVariantOnSale(null)).toBe(false);
            expect(isVariantOnSale(undefined)).toBe(false);
        });
    });

    describe('computeSalePercent', () => {
        it('returns null when not on sale', () => {
            expect(computeSalePercent(v('10'))).toBeNull();
            expect(computeSalePercent(v('10', '10'))).toBeNull();
        });

        it('returns the rounded percent off when on sale', () => {
            expect(computeSalePercent(v('75', '100'))).toBe(25);
        });
    });
});
