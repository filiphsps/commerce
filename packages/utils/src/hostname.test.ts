import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    appFromHost,
    DEV_TLDS,
    type Hostname,
    isDevHost,
    isLocalhost,
    normalizeHost,
    parseHost,
    portFromHost,
    shopFromHost,
    stripPort,
} from './hostname';

describe('DEV_TLDS', () => {
    it('is readonly and contains the expected TLDs', () => {
        expect(DEV_TLDS).toEqual(['localhost', 'test']);
    });
});

describe('stripPort', () => {
    it('removes port suffix', () => {
        expect(stripPort('my-shop.storefront.localhost:443')).toBe('my-shop.storefront.localhost');
    });

    it('returns host unchanged when no port', () => {
        expect(stripPort('my-shop.com')).toBe('my-shop.com');
    });

    it('handles empty input gracefully', () => {
        expect(stripPort('')).toBe('');
    });

    it('handles bracketed IPv6 with port', () => {
        expect(stripPort('[::1]:8080')).toBe('::1');
    });

    it('handles bracketed IPv6 without port', () => {
        expect(stripPort('[2001:db8::1]')).toBe('2001:db8::1');
    });

    it('leaves unbracketed IPv6 intact (cannot tell port from address)', () => {
        expect(stripPort('::1')).toBe('::1');
        expect(stripPort('2001:db8::1')).toBe('2001:db8::1');
    });

    it('handles IPv4 with port', () => {
        expect(stripPort('127.0.0.1:8080')).toBe('127.0.0.1');
    });
});

describe('portFromHost', () => {
    it('extracts port from DNS host', () => {
        expect(portFromHost('my-shop.localhost:443')).toBe(443);
    });

    it('extracts port from bracketed IPv6', () => {
        expect(portFromHost('[::1]:8080')).toBe(8080);
    });

    it('returns null when no port present', () => {
        expect(portFromHost('my-shop.localhost')).toBeNull();
        expect(portFromHost('[::1]')).toBeNull();
    });

    it('returns null for unbracketed IPv6', () => {
        expect(portFromHost('2001:db8::1')).toBeNull();
    });

    it('returns null for invalid port values', () => {
        expect(portFromHost('my-shop:foo')).toBeNull();
        expect(portFromHost('my-shop:99999')).toBeNull();
        expect(portFromHost('my-shop:-1')).toBeNull();
    });

    it('returns null for null/undefined/empty', () => {
        expect(portFromHost(null)).toBeNull();
        expect(portFromHost(undefined)).toBeNull();
        expect(portFromHost('')).toBeNull();
    });
});

describe('normalizeHost', () => {
    it('lowercases ASCII', () => {
        expect(normalizeHost('SHOP.EXAMPLE.COM')).toBe('shop.example.com');
    });

    it('trims surrounding whitespace', () => {
        expect(normalizeHost('  shop.example.com  ')).toBe('shop.example.com');
    });

    it('strips ports', () => {
        expect(normalizeHost('my-shop.localhost:443')).toBe('my-shop.localhost');
    });

    it('strips a single trailing dot (FQDN)', () => {
        expect(normalizeHost('example.com.')).toBe('example.com');
    });

    it('rejects double trailing dots', () => {
        expect(normalizeHost('example.com..')).toBeNull();
    });

    it('rejects empty / whitespace / leading-dot', () => {
        expect(normalizeHost('')).toBeNull();
        expect(normalizeHost('   ')).toBeNull();
        expect(normalizeHost('.localhost')).toBeNull();
        expect(normalizeHost(null)).toBeNull();
        expect(normalizeHost(undefined)).toBeNull();
    });

    it('returns a branded Hostname', () => {
        const result = normalizeHost('example.com');
        expectTypeOf(result).toEqualTypeOf<Hostname | null>();
    });
});

describe('isDevHost', () => {
    it('returns true for .localhost subdomain', () => {
        expect(isDevHost('my-shop.storefront.localhost')).toBe(true);
    });

    it('returns true for bare localhost', () => {
        expect(isDevHost('localhost')).toBe(true);
    });

    it('returns true for .test TLD', () => {
        expect(isDevHost('my-shop.storefront.test')).toBe(true);
    });

    it('returns true for bare .test', () => {
        expect(isDevHost('test')).toBe(true);
    });

    it('returns true when host has port suffix', () => {
        expect(isDevHost('storefront.localhost:443')).toBe(true);
    });

    it('returns true for admin/landing dev hosts', () => {
        expect(isDevHost('admin.localhost')).toBe(true);
        expect(isDevHost('landing.localhost')).toBe(true);
    });

    it('returns false for production domain', () => {
        expect(isDevHost('my-shop.example.com')).toBe(false);
    });

    it('returns false for empty / null / undefined', () => {
        expect(isDevHost('')).toBe(false);
        expect(isDevHost(null)).toBe(false);
        expect(isDevHost(undefined)).toBe(false);
    });

    it('is case-insensitive', () => {
        expect(isDevHost('my-shop.Storefront.LOCALHOST')).toBe(true);
    });

    it('returns false for leading-dot host', () => {
        expect(isDevHost('.localhost')).toBe(false);
    });

    it('returns false for "*.localhostsomething" — must be a real TLD match', () => {
        expect(isDevHost('localhostsomething.com')).toBe(false);
        expect(isDevHost('mylocalhost')).toBe(false);
    });
});

describe('isLocalhost', () => {
    it('is true only for bare localhost', () => {
        expect(isLocalhost('localhost')).toBe(true);
        expect(isLocalhost('LOCALHOST')).toBe(true);
        expect(isLocalhost('localhost:443')).toBe(true);
    });

    it('is false for subdomains and other dev TLDs', () => {
        expect(isLocalhost('my-shop.localhost')).toBe(false);
        expect(isLocalhost('test')).toBe(false);
    });

    it('is false for empty/null/undefined', () => {
        expect(isLocalhost('')).toBe(false);
        expect(isLocalhost(null)).toBe(false);
        expect(isLocalhost(undefined)).toBe(false);
    });
});

describe('shopFromHost', () => {
    it('extracts leftmost subdomain from dev host with 3+ segments', () => {
        expect(shopFromHost('my-shop.storefront.localhost')).toBe('my-shop');
    });

    it('handles port suffix on dev host', () => {
        expect(shopFromHost('my-shop.storefront.localhost:443')).toBe('my-shop');
    });

    it('returns empty string for bare-app dev host (2 segments)', () => {
        expect(shopFromHost('storefront.localhost')).toBe('');
    });

    it('returns empty string for admin/landing apps', () => {
        expect(shopFromHost('admin.localhost')).toBe('');
        expect(shopFromHost('landing.localhost')).toBe('');
    });

    it('returns empty string for bare TLD', () => {
        expect(shopFromHost('localhost')).toBe('');
        expect(shopFromHost('test')).toBe('');
    });

    it('returns full hostname unchanged for production', () => {
        expect(shopFromHost('shop.example.com')).toBe('shop.example.com');
    });

    it('strips port on production host', () => {
        expect(shopFromHost('shop.example.com:8080')).toBe('shop.example.com');
    });

    it('strips trailing dot on production host', () => {
        expect(shopFromHost('shop.example.com.')).toBe('shop.example.com');
    });

    it('returns empty string for empty / null / undefined', () => {
        expect(shopFromHost('')).toBe('');
        expect(shopFromHost(null)).toBe('');
        expect(shopFromHost(undefined)).toBe('');
    });

    it('handles .test TLD identically to .localhost', () => {
        expect(shopFromHost('my-shop.storefront.test')).toBe('my-shop');
    });

    it('lower-cases the result', () => {
        expect(shopFromHost('my-shop.Storefront.LOCALHOST')).toBe('my-shop');
    });

    it('lower-cases production hostname', () => {
        expect(shopFromHost('SHOP.EXAMPLE.COM')).toBe('shop.example.com');
    });

    it('returns everything before .app.tld for deeply nested dev host', () => {
        expect(shopFromHost('my-shop.tenant.storefront.localhost')).toBe('my-shop.tenant');
    });

    it('preserves dotted shop slugs (mirrors prod hostname)', () => {
        expect(shopFromHost('beta.pouched.de.storefront.localhost')).toBe('beta.pouched.de');
    });

    it('preserves dotted shop slugs across .test TLD too', () => {
        expect(shopFromHost('beta.pouched.de.storefront.test')).toBe('beta.pouched.de');
    });

    it('trims surrounding whitespace', () => {
        expect(shopFromHost('  my-shop.storefront.localhost  ')).toBe('my-shop');
    });

    it('returns empty for malformed labels', () => {
        expect(shopFromHost('a..b.localhost')).toBe('');
        expect(shopFromHost('-bad.storefront.localhost')).toBe('');
    });
});

describe('appFromHost', () => {
    it('returns the app segment for shop dev host', () => {
        expect(appFromHost('my-shop.storefront.localhost')).toBe('storefront');
    });

    it('returns the app segment for bare-app dev host', () => {
        expect(appFromHost('storefront.localhost')).toBe('storefront');
        expect(appFromHost('admin.localhost')).toBe('admin');
        expect(appFromHost('landing.localhost')).toBe('landing');
    });

    it('returns empty for bare TLD', () => {
        expect(appFromHost('localhost')).toBe('');
        expect(appFromHost('test')).toBe('');
    });

    it('returns empty for production host', () => {
        expect(appFromHost('shop.example.com')).toBe('');
    });

    it('returns empty for null/undefined/empty', () => {
        expect(appFromHost('')).toBe('');
        expect(appFromHost(null)).toBe('');
        expect(appFromHost(undefined)).toBe('');
    });

    it('handles port suffix', () => {
        expect(appFromHost('my-shop.storefront.localhost:443')).toBe('storefront');
    });

    it('treats deeply-nested dev hosts as <…shop>.<app>.<tld>', () => {
        expect(appFromHost('my-shop.tenant.storefront.localhost')).toBe('storefront');
    });

    it('handles dotted shop slugs', () => {
        expect(appFromHost('beta.pouched.de.storefront.localhost')).toBe('storefront');
    });
});

describe('parseHost', () => {
    it('parses a full shop dev host', () => {
        expect(parseHost('my-shop.storefront.localhost:443')).toEqual({
            hostname: 'my-shop.storefront.localhost',
            port: 443,
            isDev: true,
            tld: 'localhost',
            app: 'storefront',
            shop: 'my-shop',
            segments: ['my-shop', 'storefront', 'localhost'],
        });
    });

    it('parses a bare-app dev host', () => {
        expect(parseHost('storefront.localhost')).toEqual({
            hostname: 'storefront.localhost',
            port: null,
            isDev: true,
            tld: 'localhost',
            app: 'storefront',
            shop: null,
            segments: ['storefront', 'localhost'],
        });
    });

    it('parses a bare TLD', () => {
        expect(parseHost('localhost')).toEqual({
            hostname: 'localhost',
            port: null,
            isDev: true,
            tld: 'localhost',
            app: null,
            shop: null,
            segments: ['localhost'],
        });
    });

    it('parses a production host', () => {
        expect(parseHost('shop.example.com:8443')).toEqual({
            hostname: 'shop.example.com',
            port: 8443,
            isDev: false,
            tld: null,
            app: null,
            shop: null,
            segments: ['shop', 'example', 'com'],
        });
    });

    it('parses a .test TLD host', () => {
        expect(parseHost('my-shop.storefront.test')).toMatchObject({
            isDev: true,
            tld: 'test',
            app: 'storefront',
            shop: 'my-shop',
        });
    });

    it('parses a dev host with a dotted shop slug', () => {
        expect(parseHost('beta.pouched.de.storefront.localhost')).toEqual({
            hostname: 'beta.pouched.de.storefront.localhost',
            port: null,
            isDev: true,
            tld: 'localhost',
            app: 'storefront',
            shop: 'beta.pouched.de',
            segments: ['beta', 'pouched', 'de', 'storefront', 'localhost'],
        });
    });

    it('returns null for malformed input', () => {
        expect(parseHost('')).toBeNull();
        expect(parseHost('.localhost')).toBeNull();
        expect(parseHost('a..b.localhost')).toBeNull();
        expect(parseHost('-bad.localhost')).toBeNull();
        expect(parseHost(null)).toBeNull();
        expect(parseHost(undefined)).toBeNull();
    });
});
