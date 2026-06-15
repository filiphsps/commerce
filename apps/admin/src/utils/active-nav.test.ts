import { describe, expect, it } from 'vitest';

import { isHrefActive, normalizePath, resolveActiveHref } from './active-nav';

describe('normalizePath', () => {
    it('lowercases and strips a trailing slash', () => {
        expect(normalizePath('/Shop/Settings/')).toBe('/shop/settings');
        expect(normalizePath('/shop/settings')).toBe('/shop/settings');
    });

    it('keeps the bare root as /', () => {
        expect(normalizePath('/')).toBe('/');
    });
});

describe('isHrefActive', () => {
    it('matches equal and descendant routes at a segment boundary', () => {
        expect(isHrefActive('/abc/content/articles/', '/abc/content/')).toBe(true);
        expect(isHrefActive('/abc/content/', '/abc/content/')).toBe(true);
    });

    it('does not match on a non-boundary prefix', () => {
        expect(isHrefActive('/abc/settings-billing/', '/abc/settings')).toBe(false);
    });

    it('treats a domain root href as exact-only', () => {
        expect(isHrefActive('/abc/', '/abc/')).toBe(true);
        expect(isHrefActive('/abc/products/', '/abc/')).toBe(true);
    });
});

describe('resolveActiveHref', () => {
    const RAIL = ['/abc/', '/abc/products/', '/abc/settings', '/abc/settings/users/'];

    it('selects only the most specific sibling — the Settings+Users regression', () => {
        // On /abc/settings/users, the old prefix check lit up both Settings and Users.
        expect(resolveActiveHref('/abc/settings/users/', RAIL)).toBe('/abc/settings/users/');
    });

    it('selects the section root when on the section root', () => {
        expect(resolveActiveHref('/abc/settings/', RAIL)).toBe('/abc/settings');
    });

    it('selects Home only on the exact domain root', () => {
        expect(resolveActiveHref('/abc/', RAIL)).toBe('/abc/');
        expect(resolveActiveHref('/abc/products/', RAIL)).toBe('/abc/products/');
    });

    it('returns null when nothing covers the path', () => {
        expect(resolveActiveHref('/xyz/', RAIL)).toBeNull();
    });
});
