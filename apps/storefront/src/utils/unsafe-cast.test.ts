import { describe, expect, it } from 'vitest';
import { unsafe_cast } from './unsafe-cast';

describe('unsafe_cast', () => {
    it('returns the value unchanged', () => {
        const x = { a: 1 };
        expect(unsafe_cast<{ a: number }>(x)).toBe(x);
    });
});
