import { describe, expect, it } from 'vitest';
import { isLinkableToken, resolveLink, type SymbolIndex } from './jsdoc-link-resolver';

describe('isLinkableToken', () => {
    it('accepts camelCase identifiers', () => {
        expect(isLinkableToken('getArticle')).toBe(true);
    });

    it('accepts PascalCase identifiers', () => {
        expect(isLinkableToken('ShopRef')).toBe(true);
    });

    it('accepts SCREAMING_SNAKE_CASE identifiers', () => {
        expect(isLinkableToken('API_UNKNOWN_LOCALE')).toBe(true);
    });

    it('rejects blocklisted identifiers', () => {
        expect(isLinkableToken('Error')).toBe(false);
        expect(isLinkableToken('Promise')).toBe(false);
    });

    it('rejects short identifiers', () => {
        expect(isLinkableToken('id')).toBe(false);
    });

    it('rejects mixed-form tokens (hyphens, dots)', () => {
        expect(isLinkableToken('multi-tenancy')).toBe(false);
    });
});

describe('resolveLink', () => {
    const index: SymbolIndex = {
        getArticle: [
            {
                url: '/docs/reference/cms/api/get-article/',
                kind: 'function',
                tab: 'reference',
                pkg: 'cms',
                subpath: 'api',
            },
        ],
        NotFoundError: [
            {
                url: '/docs/reference/errors/index/not-found-error/',
                kind: 'class',
                tab: 'reference',
                pkg: 'errors',
                subpath: 'index',
            },
        ],
        API_UNKNOWN_LOCALE: [
            {
                url: '/docs/errors/api-unknown-locale/',
                kind: 'error',
                tab: 'errors',
            },
        ],
    };

    it('resolves a unique token to its URL', () => {
        const r = resolveLink(index, 'getArticle', { tab: 'packages', pkg: 'cms', subpath: 'api' });
        expect(r?.url).toBe('/docs/reference/cms/api/get-article/');
        expect(r?.ambiguous).toBe(false);
    });

    it('returns null for unknown tokens', () => {
        const r = resolveLink(index, 'unknownThing', { tab: 'packages' });
        expect(r).toBeNull();
    });

    it('routes SCREAMING_SNAKE_CASE to the errors tab', () => {
        const r = resolveLink(index, 'API_UNKNOWN_LOCALE', { tab: 'reference' });
        expect(r?.tab).toBe('errors');
    });
});
