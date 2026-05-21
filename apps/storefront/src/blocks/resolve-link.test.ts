import { describe, expect, it } from 'vitest';
import { resolveLink } from './resolve-link';

// The link resolver is the boundary between editor-authored LinkRefs and
// rendered anchors. Bugs here are split between two failure modes: (a)
// missing links (returns null and CTAs disappear) and (b) unsafe links
// (`javascript:` payloads slip through). These tests pin both edges plus
// the locale-aware internal href shape.

const locale = { code: 'en-US' } as { code: string } & { country: string };

describe('resolveLink', () => {
    it('returns null for null / undefined / empty link', () => {
        expect(resolveLink(null, { locale: locale as never })).toBeNull();
        expect(resolveLink(undefined, { locale: locale as never })).toBeNull();
        expect(resolveLink({}, { locale: locale as never })).toBeNull();
    });

    it('resolves external HTTPS URLs as-is and forwards openInNewTab', () => {
        const out = resolveLink(
            { kind: 'external', url: 'https://example.com/path', openInNewTab: true },
            { locale: locale as never },
        );
        expect(out).toEqual({ href: 'https://example.com/path', openInNewTab: true });
    });

    it('refuses javascript: payloads on external links', () => {
        expect(resolveLink({ kind: 'external', url: 'javascript:alert(1)' }, { locale: locale as never })).toBeNull();
    });

    it('refuses data: payloads on external links', () => {
        expect(
            resolveLink(
                { kind: 'external', url: 'data:text/html,<script>alert(1)</script>' },
                { locale: locale as never },
            ),
        ).toBeNull();
    });

    it('accepts mailto: and tel: schemes', () => {
        expect(resolveLink({ kind: 'external', url: 'mailto:a@b.test' }, { locale: locale as never })).toEqual({
            href: 'mailto:a@b.test',
            openInNewTab: false,
        });
        expect(resolveLink({ kind: 'external', url: 'tel:+1234' }, { locale: locale as never })).toEqual({
            href: 'tel:+1234',
            openInNewTab: false,
        });
    });

    it('resolves anchor links with leading hash', () => {
        expect(resolveLink({ kind: 'anchor', url: 'features' }, { locale: locale as never })).toEqual({
            href: '#features',
            openInNewTab: false,
        });
        expect(resolveLink({ kind: 'anchor', url: '#features' }, { locale: locale as never })).toEqual({
            href: '#features',
            openInNewTab: false,
        });
    });

    it('resolves page links with locale-prefixed path + trailing slash', () => {
        expect(resolveLink({ kind: 'page', page: { slug: 'about' } }, { locale: locale as never })).toEqual({
            href: '/en-US/about/',
            openInNewTab: false,
        });
    });

    it('returns null for a page link whose relation is unpopulated (id string)', () => {
        expect(resolveLink({ kind: 'page', page: 'some-id' }, { locale: locale as never })).toBeNull();
    });

    it('resolves article links to the blog path', () => {
        expect(resolveLink({ kind: 'article', article: { slug: 'hello' } }, { locale: locale as never })).toEqual({
            href: '/en-US/blog/hello/',
            openInNewTab: false,
        });
    });

    it('resolves product links by Shopify handle', () => {
        expect(
            resolveLink({ kind: 'product', product: { shopifyHandle: 'tee' } }, { locale: locale as never }),
        ).toEqual({ href: '/en-US/products/tee/', openInNewTab: false });
    });

    it('resolves collection links by Shopify handle', () => {
        expect(
            resolveLink({ kind: 'collection', collectionRef: { shopifyHandle: 'sale' } }, { locale: locale as never }),
        ).toEqual({ href: '/en-US/collections/sale/', openInNewTab: false });
    });

    it('treats pre-`kind` legacy data with a raw url as external, still scheme-gated', () => {
        expect(resolveLink({ url: 'https://example.com' }, { locale: locale as never })).toEqual({
            href: 'https://example.com',
            openInNewTab: false,
        });
        expect(resolveLink({ url: 'javascript:alert(1)' }, { locale: locale as never })).toBeNull();
    });
});
