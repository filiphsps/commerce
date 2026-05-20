import { describe, expect, it } from 'vitest';

import { deriveDefaults } from './derive';

describe('deriveDefaults', () => {
    it('derives PascalCase componentName from snake_case slug', () => {
        expect(deriveDefaults('visa')).toEqual({
            componentName: 'Visa',
            title: 'Visa',
        });
        expect(deriveDefaults('american_express')).toEqual({
            componentName: 'AmericanExpress',
            title: 'American Express',
        });
        expect(deriveDefaults('apple_pay')).toEqual({
            componentName: 'ApplePay',
            title: 'Apple Pay',
        });
    });

    it('handles kebab-case slugs by splitting on both _ and -', () => {
        expect(deriveDefaults('shop-pay')).toEqual({
            componentName: 'ShopPay',
            title: 'Shop Pay',
        });
    });

    it('prefixes a leading-digit slug with Icon', () => {
        expect(deriveDefaults('2c2p')).toEqual({
            componentName: 'Icon2c2p',
            title: '2c2p',
        });
    });

    it('keeps single-word slugs unchanged', () => {
        expect(deriveDefaults('swish')).toEqual({
            componentName: 'Swish',
            title: 'Swish',
        });
        expect(deriveDefaults('bca')).toEqual({
            componentName: 'Bca',
            title: 'Bca',
        });
    });
});
