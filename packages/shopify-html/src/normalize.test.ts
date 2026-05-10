import { describe, expect, it } from 'vitest';
import { normalize } from './normalize';

describe('normalize', () => {
    it('returns null for null/undefined/non-string input', () => {
        expect(normalize(null)).toBeNull();
        expect(normalize(undefined)).toBeNull();
        expect(normalize(123 as unknown as string)).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(normalize('')).toBeNull();
        expect(normalize('   ')).toBeNull();
    });

    it('strips <meta>, <script>, <style> elements entirely', () => {
        const input = '<p>Keep</p><meta charset="UTF-8"><script>alert(1)</script><style>p{color:red}</style>';
        const root = normalize(input);
        expect(root!.querySelector('meta')).toBeNull();
        expect(root!.querySelector('script')).toBeNull();
        expect(root!.querySelector('style')).toBeNull();
        expect(root!.querySelector('p')!.text).toBe('Keep');
    });

    it('drops data-* attributes from every element', () => {
        const input = '<a href="/x" data-track="123" data-foo="bar">Link</a>';
        const root = normalize(input);
        const a = root!.querySelector('a')!;
        expect(a.getAttribute('href')).toBe('/x');
        expect(a.getAttribute('data-track')).toBeUndefined();
        expect(a.getAttribute('data-foo')).toBeUndefined();
    });

    it('collapses non-breaking spaces to regular spaces', () => {
        const input = '<p>foo bar&nbsp;baz</p>';
        const root = normalize(input);
        expect(root!.querySelector('p')!.text).toBe('foo bar baz');
    });

    it('collapses raw U+00A0 characters (not just &nbsp; entities) to regular spaces', () => {
        // Use String.fromCharCode so the U+00A0 bytes are unambiguous in source.
        const nbsp = String.fromCharCode(0xa0);
        const input = `<p>foo${nbsp}bar${nbsp}baz</p>`;
        const root = normalize(input);
        expect(root!.querySelector('p')!.text).toBe('foo bar baz');
    });

    it('trims outer whitespace', () => {
        const input = '   <p>hello</p>   ';
        const root = normalize(input);
        expect(root!.toString().startsWith('<p>')).toBe(true);
        expect(root!.toString().endsWith('</p>')).toBe(true);
    });
});
