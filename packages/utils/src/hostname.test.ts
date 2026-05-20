import { describe, expect, it } from 'vitest';

import { isDevHost, shopFromHost, stripPort } from './hostname';

describe('stripPort', () => {
    it('removes port suffix', () => {
        expect(stripPort('myshop.storefront.localhost:443')).toBe('myshop.storefront.localhost');
    });

    it('returns host unchanged when no port', () => {
        expect(stripPort('myshop.com')).toBe('myshop.com');
    });

    it('handles empty input gracefully', () => {
        expect(stripPort('')).toBe('');
    });
});

describe('isDevHost', () => {
    it('returns true for .localhost subdomain', () => {
        expect(isDevHost('myshop.storefront.localhost')).toBe(true);
    });

    it('returns true for bare localhost', () => {
        expect(isDevHost('localhost')).toBe(true);
    });

    it('returns true for .test TLD', () => {
        expect(isDevHost('myshop.storefront.test')).toBe(true);
    });

    it('returns true when host has port suffix', () => {
        expect(isDevHost('storefront.localhost:443')).toBe(true);
    });

    it('returns false for production domain', () => {
        expect(isDevHost('myshop.example.com')).toBe(false);
    });

    it('returns false for empty / null / undefined', () => {
        expect(isDevHost('')).toBe(false);
        expect(isDevHost(null)).toBe(false);
        expect(isDevHost(undefined)).toBe(false);
    });

    it('is case-insensitive', () => {
        expect(isDevHost('MyShop.Storefront.LOCALHOST')).toBe(true);
    });
});

describe('shopFromHost', () => {
    it('extracts leftmost subdomain from dev host with 3+ segments', () => {
        expect(shopFromHost('myshop.storefront.localhost')).toBe('myshop');
    });

    it('handles port suffix on dev host', () => {
        expect(shopFromHost('myshop.storefront.localhost:443')).toBe('myshop');
    });

    it('returns empty string for bare-app dev host (2 segments)', () => {
        expect(shopFromHost('storefront.localhost')).toBe('');
    });

    it('returns empty string for bare TLD', () => {
        expect(shopFromHost('localhost')).toBe('');
    });

    it('returns full hostname unchanged for production', () => {
        expect(shopFromHost('shop.example.com')).toBe('shop.example.com');
    });

    it('strips port on production host', () => {
        expect(shopFromHost('shop.example.com:8080')).toBe('shop.example.com');
    });

    it('returns empty string for empty / null / undefined', () => {
        expect(shopFromHost('')).toBe('');
        expect(shopFromHost(null)).toBe('');
        expect(shopFromHost(undefined)).toBe('');
    });

    it('handles .test TLD identically to .localhost', () => {
        expect(shopFromHost('myshop.storefront.test')).toBe('myshop');
    });

    it('lower-cases the result', () => {
        expect(shopFromHost('MyShop.Storefront.LOCALHOST')).toBe('myshop');
    });
});
