import { describe, expect, it } from 'vitest';
import { toPlainText } from './to-plain-text';

describe('toPlainText', () => {
    it('returns empty string for null/undefined/non-string', () => {
        expect(toPlainText(null)).toBe('');
        expect(toPlainText(undefined)).toBe('');
        expect(toPlainText(42 as unknown as string)).toBe('');
    });

    it('returns empty string for empty input', () => {
        expect(toPlainText('')).toBe('');
        expect(toPlainText('   ')).toBe('');
    });

    it('strips all tags and preserves inline text order', () => {
        expect(toPlainText('<p>hello <strong>world</strong></p>')).toBe('hello world');
    });

    it('separates block elements with newlines', () => {
        expect(toPlainText('<p>one</p><p>two</p>')).toBe('one\ntwo');
    });

    it('treats <br>, headings, and list items as block separators', () => {
        expect(toPlainText('<h1>title</h1><p>body</p>')).toBe('title\nbody');
        expect(toPlainText('<ul><li>a</li><li>b</li></ul>')).toBe('a\nb');
        expect(toPlainText('foo<br>bar')).toBe('foo\nbar');
    });

    it('separates table cells with newlines', () => {
        expect(toPlainText('<table><tr><td>Price</td><td>10</td></tr></table>')).toBe('Price\n10');
        expect(toPlainText('<table><tr><th>Header</th></tr><tr><td>Body</td></tr></table>')).toBe('Header\nBody');
    });

    it('removes <meta>/<script>/<style> content', () => {
        expect(toPlainText('<p>keep</p><script>alert(1)</script>')).toBe('keep');
        expect(toPlainText('<style>p{}</style><p>keep</p>')).toBe('keep');
    });

    it('preserves unicode characters (no HTML entity encoding)', () => {
        expect(toPlainText('<p>\u201chello\u201d\u2026</p>')).toBe('\u201chello\u201d\u2026');
    });

    it('collapses non-breaking spaces', () => {
        expect(toPlainText('<p>a\u00a0b</p>')).toBe('a b');
    });
});
