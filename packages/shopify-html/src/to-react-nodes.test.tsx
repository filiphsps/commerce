import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { toReactNodes } from './to-react-nodes';

function html(node: ReturnType<typeof toReactNodes>): string {
    const { container } = render(node);
    return container.innerHTML;
}

describe('toReactNodes', () => {
    it('returns null for null/undefined/non-string/empty', () => {
        expect(toReactNodes(null)).toBeNull();
        expect(toReactNodes(undefined)).toBeNull();
        expect(toReactNodes(42 as unknown as string)).toBeNull();
        expect(toReactNodes('')).toBeNull();
        expect(toReactNodes('   ')).toBeNull();
    });

    it('renders a simple paragraph', () => {
        expect(html(toReactNodes('<p>hello</p>'))).toBe('<p>hello</p>');
    });

    it('renders nested formatting', () => {
        expect(html(toReactNodes('<p>a <strong>b</strong> c</p>'))).toBe('<p>a <strong>b</strong> c</p>');
    });

    it('renders lists', () => {
        expect(html(toReactNodes('<ul><li>a</li><li>b</li></ul>'))).toBe('<ul><li>a</li><li>b</li></ul>');
    });

    it('converts class to className', () => {
        expect(html(toReactNodes('<p class="lead">hi</p>'))).toBe('<p class="lead">hi</p>');
    });

    it('strips <meta>, <script>, <style>', () => {
        expect(html(toReactNodes('<p>keep</p><script>alert(1)</script>'))).toBe('<p>keep</p>');
    });

    it('strips data-* attributes', () => {
        expect(html(toReactNodes('<a href="/x" data-track="1">go</a>'))).toBe('<a href="/x">go</a>');
    });

    it('uses provided component override for a tag', () => {
        const Anchor = (props: ComponentProps<'a'>) => <a {...props} data-test="overridden" />;
        const out = html(toReactNodes('<a href="/x">go</a>', { components: { a: Anchor } }));
        expect(out).toBe('<a href="/x" data-test="overridden">go</a>');
    });

    it('decodes HTML entities in text content', () => {
        expect(html(toReactNodes('<p>R&amp;D &mdash; great</p>'))).toBe('<p>R&amp;D — great</p>');
    });

    it('filters whitespace-only text nodes between elements', () => {
        expect(html(toReactNodes('<ul>\n  <li>a</li>\n  <li>b</li>\n</ul>'))).toBe('<ul><li>a</li><li>b</li></ul>');
    });

    it('renames table-cell colspan/rowspan to React conventions', () => {
        const out = html(toReactNodes('<table><tbody><tr><td colspan="2">cell</td></tr></tbody></table>'));
        expect(out).toBe('<table><tbody><tr><td colspan="2">cell</td></tr></tbody></table>');
    });
});
