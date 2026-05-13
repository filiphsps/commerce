import { describe, expect, it } from 'vitest';
import { resolveLink } from './resolve-link';

const locale = { code: 'sv' };

describe('resolveLink', () => {
    it('resolves external URLs as-is', () => {
        expect(resolveLink({ kind: 'external', url: 'https://example.com' }, { locale })).toBe('https://example.com');
    });
    it('resolves anchor links with leading hash', () => {
        expect(resolveLink({ kind: 'anchor', url: 'features' }, { locale })).toBe('#features');
    });
    it('resolves page links with locale prefix + trailing slash', () => {
        expect(resolveLink({ kind: 'page', page: { slug: 'about' } }, { locale })).toBe('/sv/about/');
    });
    it('resolves article links to blog path', () => {
        expect(resolveLink({ kind: 'article', article: { slug: 'hello' } }, { locale })).toBe('/sv/blog/hello/');
    });
    it('resolves product links by Shopify handle', () => {
        expect(resolveLink({ kind: 'product', product: { shopifyHandle: 'sour-worms' } }, { locale })).toBe(
            '/sv/products/sour-worms/',
        );
    });
    it('resolves collection links by Shopify handle', () => {
        expect(resolveLink({ kind: 'collection', collectionRef: { shopifyHandle: 'candy' } }, { locale })).toBe(
            '/sv/collections/candy/',
        );
    });
    it('returns empty string for incomplete links', () => {
        expect(resolveLink({ kind: 'page' } as never, { locale })).toBe('');
    });
});
