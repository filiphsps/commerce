import type { OnlineShop } from '@nordcom/commerce-db';
import { describe, expect, it } from 'vitest';

import { resolveShopCurrency } from './provider';

const shopWith = (currency?: string) => ({ commerce: currency === undefined ? undefined : { currency } }) as OnlineShop;

describe('resolveShopCurrency', () => {
    it('prefers the explicit override', () => {
        expect(resolveShopCurrency(shopWith('EUR'), 'GBP')).toBe('GBP');
    });
    it('falls back to the shop currency', () => {
        expect(resolveShopCurrency(shopWith('EUR'))).toBe('EUR');
    });
    it('defaults to USD when neither is set', () => {
        expect(resolveShopCurrency(shopWith(undefined))).toBe('USD');
    });
});
