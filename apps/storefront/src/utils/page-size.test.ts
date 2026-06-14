import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';

import { COLLECTION_PRODUCTS_PER_PAGE, clampPageSize, collectionPageSize } from './page-size';

const shopWith = (productsPerPage?: number) =>
    ({ commerce: productsPerPage === undefined ? undefined : { productsPerPage } }) as OnlineShop;

describe('clampPageSize', () => {
    it('passes a normal page size through unchanged', () => {
        expect(clampPageSize(21)).toBe(21);
        expect(clampPageSize(35)).toBe(35);
    });

    it('floors below 1 up to 1', () => {
        expect(clampPageSize(0)).toBe(1);
        expect(clampPageSize(-10)).toBe(1);
    });

    it("saturates above Shopify's 250 cap", () => {
        expect(clampPageSize(251)).toBe(250);
        expect(clampPageSize(10_000)).toBe(250);
    });

    it('floors a fractional size to an integer', () => {
        expect(clampPageSize(21.9)).toBe(21);
        expect(clampPageSize(0.5)).toBe(1);
    });

    it('returns 1 for non-finite input', () => {
        expect(clampPageSize(Number.NaN)).toBe(1);
        expect(clampPageSize(Number.POSITIVE_INFINITY)).toBe(1);
    });
});

describe('collectionPageSize', () => {
    it('falls back to the collection default when no override is set', () => {
        expect(collectionPageSize(shopWith(undefined))).toBe(COLLECTION_PRODUCTS_PER_PAGE);
    });

    it('uses the per-shop override', () => {
        expect(collectionPageSize(shopWith(48))).toBe(48);
    });

    it('clamps the override to Shopify bounds', () => {
        expect(collectionPageSize(shopWith(1000))).toBe(250);
        expect(collectionPageSize(shopWith(0))).toBe(1);
    });
});
