import { afterEach, describe, expect, it } from 'vitest';
import { __getLocaleUnwrapCount, __resetLocaleUnwrapCount, normalizePayloadDoc } from './_normalize-payload';

// The normalizer's job is to resolve Payload's `{ <locale>: value }` shapes
// to the requested locale without disturbing legitimately-shaped data.
// These tests pin both edges — the locale-map cases (single-key, language-
// fallback, nested) and the false-positive risk cases (Media depth=0,
// known-field groups whose keys overlap with ISO 639-1 codes).

afterEach(() => {
    __resetLocaleUnwrapCount();
});

describe('normalizePayloadDoc', () => {
    it('passes through primitives unchanged', () => {
        expect(normalizePayloadDoc('hello', 'en-US')).toBe('hello');
        expect(normalizePayloadDoc(42, 'en-US')).toBe(42);
        expect(normalizePayloadDoc(true, 'en-US')).toBe(true);
        expect(normalizePayloadDoc(null, 'en-US')).toBeNull();
        expect(normalizePayloadDoc(undefined, 'en-US')).toBeUndefined();
        expect(__getLocaleUnwrapCount()).toBe(0);
    });

    it('unwraps a locale map to the requested locale', () => {
        const doc = { 'en-US': 'Hello', 'sv-SE': 'Hej' };
        const out = normalizePayloadDoc(doc, 'en-US');
        expect(out).toBe('Hello');
        expect(__getLocaleUnwrapCount()).toBe(1);
    });

    it('falls back to language-only when the regional variant is absent', () => {
        // Editor authored `en`; storefront requests `en-US`. Take the
        // language-only entry rather than returning `undefined`.
        const doc = { en: 'Hello', sv: 'Hej' };
        expect(normalizePayloadDoc(doc, 'en-US')).toBe('Hello');
    });

    it('falls back to any non-null value as the last resort', () => {
        const doc = { sv: 'Hej', de: 'Hallo' };
        const out = normalizePayloadDoc(doc, 'en-US');
        // Iteration order is insertion order — first non-null.
        expect(out).toBe('Hej');
    });

    it('unwraps locale maps inside arrays', () => {
        const doc = [
            { 'en-US': 'a', 'sv-SE': 'b' },
            { 'en-US': 'c', 'sv-SE': 'd' },
        ];
        expect(normalizePayloadDoc(doc, 'en-US')).toEqual(['a', 'c']);
        expect(__getLocaleUnwrapCount()).toBe(2);
    });

    it('recurses into nested objects, preserving non-locale-map structure', () => {
        const page = {
            id: '1',
            title: { 'en-US': 'Home', 'sv-SE': 'Hem' },
            slug: 'home',
            blocks: [
                {
                    id: 'a',
                    blockType: 'alert',
                    severity: 'info',
                    title: { 'en-US': 'Heads up', 'sv-SE': 'Hej!' },
                    body: { 'en-US': 'Body en', 'sv-SE': 'Body sv' },
                },
            ],
        };
        expect(normalizePayloadDoc(page, 'en-US')).toEqual({
            id: '1',
            title: 'Home',
            slug: 'home',
            blocks: [
                {
                    id: 'a',
                    blockType: 'alert',
                    severity: 'info',
                    title: 'Heads up',
                    body: 'Body en',
                },
            ],
        });
        expect(__getLocaleUnwrapCount()).toBe(3);
    });

    it('unwraps a localized Lexical richText document', () => {
        const body = {
            'en-US': { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'EN' }] }] } },
            'sv-SE': { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'SV' }] }] } },
        };
        const out = normalizePayloadDoc({ body }, 'en-US') as unknown as { body: { root: { children: unknown[] } } };
        expect(out.body.root.children).toHaveLength(1);
        expect(__getLocaleUnwrapCount()).toBe(1);
    });

    it('does NOT unwrap a single-key object even when the key is a valid locale code', () => {
        // The classic false-positive trap: an unpopulated Media relation has
        // shape `{ id: '<ObjectId>' }`, and `id` is the ISO 639-1 code for
        // Indonesian. Single-key objects must be left alone.
        const depth0Media = { id: '64a5f8c9d1234567' };
        expect(normalizePayloadDoc(depth0Media, 'en-US')).toEqual(depth0Media);
        expect(__getLocaleUnwrapCount()).toBe(0);
    });

    it('does NOT unwrap object groups whose keys mix locale-looking and non-locale keys', () => {
        // `cta` (linkField) shape — `url` isn't a locale code, so the whole
        // object passes through unchanged.
        const cta = { kind: 'external', url: 'https://example.com', label: 'Click', openInNewTab: true };
        expect(normalizePayloadDoc(cta, 'en-US')).toEqual(cta);
        // Same for SEO group.
        const seo = { title: 'T', description: 'D', keywords: ['a'], noindex: false };
        expect(normalizePayloadDoc(seo, 'en-US')).toEqual(seo);
        expect(__getLocaleUnwrapCount()).toBe(0);
    });

    it('does NOT unwrap a populated Media object', () => {
        const media = { id: 'm1', alt: 'logo', url: 'https://cdn.test/a.png', width: 100, height: 100 };
        expect(normalizePayloadDoc(media, 'en-US')).toEqual(media);
        expect(__getLocaleUnwrapCount()).toBe(0);
    });

    it('handles a fully-typed Article shape end-to-end', () => {
        const article = {
            id: 'a1',
            title: { 'en-US': 'Hello', 'sv-SE': 'Hej' },
            slug: 'hello',
            author: 'A',
            tags: ['news', 'release'],
            body: {
                'en-US': { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'EN body' }] }] } },
                'sv-SE': { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'SV body' }] }] } },
            },
            cover: { id: 'm1', alt: 'cover', url: 'https://cdn.test/c.png' },
        };
        const out = normalizePayloadDoc(article, 'en-US') as unknown as {
            title: string;
            body: unknown;
            cover: { url: string };
        };
        expect(out.title).toBe('Hello');
        expect(out.body).toMatchObject({ root: { children: [{ type: 'paragraph' }] } });
        expect(out.cover.url).toBe('https://cdn.test/c.png');
    });
});
