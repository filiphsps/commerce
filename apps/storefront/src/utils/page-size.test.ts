import { describe, expect, it } from 'vitest';

import { clampPageSize } from './page-size';

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
