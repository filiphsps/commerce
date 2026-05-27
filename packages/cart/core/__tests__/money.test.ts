import { describe, expect, it } from 'vitest';
import { money } from '../src/money';

describe('money', () => {
    it('parses USD decimal string to integer cents', () => {
        expect(money.parse({ amount: '12.34', currencyCode: 'USD' })).toEqual({
            cents: 1234,
            currencyCode: 'USD',
        });
    });

    it('formats integer cents back to decimal string with currency scale', () => {
        expect(money.format({ cents: 1234, currencyCode: 'USD' })).toEqual({
            amount: '12.34',
            currencyCode: 'USD',
        });
    });

    it('handles JPY with scale=0', () => {
        const parsed = money.parse({ amount: '1234', currencyCode: 'JPY' });
        expect(parsed.cents).toBe(1234);
        expect(money.format(parsed).amount).toBe('1234');
    });

    it('handles BHD with scale=3', () => {
        const parsed = money.parse({ amount: '1.234', currencyCode: 'BHD' });
        expect(parsed.cents).toBe(1234);
        expect(money.format(parsed).amount).toBe('1.234');
    });

    it('add/sub/mul preserve currency scale', () => {
        const a = money.parse({ amount: '1.00', currencyCode: 'USD' });
        const b = money.parse({ amount: '2.50', currencyCode: 'USD' });
        expect(money.format(money.add(a, b))).toEqual({ amount: '3.50', currencyCode: 'USD' });
        expect(money.format(money.sub(b, a))).toEqual({ amount: '1.50', currencyCode: 'USD' });
        expect(money.format(money.mul(a, 3))).toEqual({ amount: '3.00', currencyCode: 'USD' });
    });

    it('eq / lt / gt comparisons', () => {
        const a = money.parse({ amount: '1.00', currencyCode: 'USD' });
        const b = money.parse({ amount: '2.00', currencyCode: 'USD' });
        expect(money.eq(a, a)).toBe(true);
        expect(money.lt(a, b)).toBe(true);
        expect(money.gt(b, a)).toBe(true);
    });

    it('zero returns currency-scoped zero', () => {
        expect(money.zero('USD')).toEqual({ cents: 0, currencyCode: 'USD' });
    });

    it('throws when add/sub/eq currencies differ', () => {
        const usd = money.parse({ amount: '1.00', currencyCode: 'USD' });
        const eur = money.parse({ amount: '1.00', currencyCode: 'EUR' });
        expect(() => money.add(usd, eur)).toThrow(/currency mismatch/i);
    });
});
