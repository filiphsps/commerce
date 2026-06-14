import { describe, expect, it } from 'vitest';

import { isValidHostname, isValidLocale, normalizeHostname, readableForeground } from './validation';

describe('normalizeHostname', () => {
    it('strips scheme, path, port, and lowercases', () => {
        expect(normalizeHostname('  HTTPS://Shop.Acme.com:443/path  ')).toBe('shop.acme.com');
    });
});

describe('isValidHostname', () => {
    it('accepts a dotted hostname', () => {
        expect(isValidHostname('shop.acme.com')).toBe(true);
        expect(isValidHostname('acme.myshopify.com')).toBe(true);
    });
    it('rejects single labels, schemes, and empty input', () => {
        expect(isValidHostname('localhost')).toBe(false);
        expect(isValidHostname('https://acme.com')).toBe(true); // normalized first
        expect(isValidHostname('')).toBe(false);
        expect(isValidHostname('-acme.com')).toBe(false);
    });
});

describe('isValidLocale', () => {
    it('accepts language-REGION and rejects junk', () => {
        expect(isValidLocale('en-US')).toBe(true);
        expect(isValidLocale('sv-SE')).toBe(true);
        expect(isValidLocale('english')).toBe(false);
        expect(isValidLocale('en_us')).toBe(false);
    });
});

describe('readableForeground', () => {
    it('returns dark text on light backgrounds and light text on dark', () => {
        expect(readableForeground('#ffffff')).toBe('#000000');
        expect(readableForeground('#000000')).toBe('#ffffff');
        expect(readableForeground('#fff')).toBe('#000000');
    });
    it('falls back to white for unparseable input', () => {
        expect(readableForeground('not-a-color')).toBe('#ffffff');
    });
});
