import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isRichTextEmpty, RichText } from './rich-text-renderer';

// The renderer is the gatekeeper for Payload's Lexical JSON. Bugs here
// can either silently drop content (an unhandled node type vanishing) or
// emit invisible empty wrappers around every paragraph. These tests pin
// both — and exercise text formatting marks so the bitmask -> tag mapping
// can't drift.

const locale = { code: 'en-US' } as never;

// Next.js `Link` component pulls in the full router/shop provider stack
// — too heavy for a renderer unit test. Stub it to a plain anchor; we
// only care that the renderer routes external links through `Link` at
// all, not how Link itself renders.
vi.mock('@/components/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const root = (children: unknown[]): { root: { children: unknown[] } } => ({ root: { children } });

describe('RichText', () => {
    it('returns null for an empty document so callers can skip the wrapper', () => {
        expect(RichText({ data: null, locale })).toBeNull();
        expect(RichText({ data: { root: { children: [] } }, locale })).toBeNull();
    });

    it('renders a paragraph with text', () => {
        const { container } = render(
            <RichText
                data={root([{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }]) as never}
                locale={locale}
            />,
        );
        expect(container.querySelector('p')?.textContent).toBe('Hello');
    });

    it('applies bold / italic / underline formatting marks', () => {
        // Lexical FORMAT bitmask: bold=1, italic=2, underline=8.
        const { container } = render(
            <RichText
                data={
                    root([
                        {
                            type: 'paragraph',
                            children: [
                                { type: 'text', text: 'b', format: 1 },
                                { type: 'text', text: 'i', format: 2 },
                                { type: 'text', text: 'u', format: 8 },
                            ],
                        },
                    ]) as never
                }
                locale={locale}
            />,
        );
        expect(container.querySelector('strong')?.textContent).toBe('b');
        expect(container.querySelector('em')?.textContent).toBe('i');
        expect(container.querySelector('u')?.textContent).toBe('u');
    });

    it('renders ordered and unordered lists by listType', () => {
        const { container } = render(
            <RichText
                data={
                    root([
                        {
                            type: 'list',
                            listType: 'number',
                            children: [{ type: 'listitem', children: [{ type: 'text', text: 'one' }] }],
                        },
                        {
                            type: 'list',
                            listType: 'bullet',
                            children: [{ type: 'listitem', children: [{ type: 'text', text: 'two' }] }],
                        },
                    ]) as never
                }
                locale={locale}
            />,
        );
        expect(container.querySelector('ol')?.textContent).toBe('one');
        expect(container.querySelector('ul')?.textContent).toBe('two');
    });

    it('renders a heading at the editor-chosen level', () => {
        const { container } = render(
            <RichText
                data={root([{ type: 'heading', tag: 'h3', children: [{ type: 'text', text: 'Title' }] }]) as never}
                locale={locale}
            />,
        );
        expect(container.querySelector('h3')?.textContent).toBe('Title');
    });

    it('renders a quote as <blockquote>', () => {
        const { container } = render(
            <RichText
                data={root([{ type: 'quote', children: [{ type: 'text', text: 'q' }] }]) as never}
                locale={locale}
            />,
        );
        expect(container.querySelector('blockquote')?.textContent).toBe('q');
    });

    it('routes external link nodes through resolveLink (scheme-gated)', () => {
        const { container } = render(
            <RichText
                data={
                    root([
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'link',
                                    fields: { url: 'https://example.com', newTab: true },
                                    children: [{ type: 'text', text: 'click' }],
                                },
                            ],
                        },
                    ]) as never
                }
                locale={locale}
            />,
        );
        const anchor = container.querySelector('a');
        expect(anchor?.getAttribute('href')).toBe('https://example.com');
        expect(anchor?.textContent).toBe('click');
    });

    it('drops javascript: links but keeps the inner text', () => {
        const { container } = render(
            <RichText
                data={
                    root([
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'link',
                                    fields: { url: 'javascript:alert(1)' },
                                    children: [{ type: 'text', text: 'click' }],
                                },
                            ],
                        },
                    ]) as never
                }
                locale={locale}
            />,
        );
        expect(container.querySelector('a')).toBeNull();
        expect(container.textContent).toContain('click');
    });

    it("falls through unknown node types but preserves their children — editors don't lose content", () => {
        const { container } = render(
            <RichText
                data={
                    root([
                        {
                            type: 'paragraph',
                            children: [
                                {
                                    type: 'futureUnknownNode',
                                    children: [{ type: 'text', text: 'survives' }],
                                },
                            ],
                        },
                    ]) as never
                }
                locale={locale}
            />,
        );
        expect(container.textContent).toBe('survives');
    });
});

describe('isRichTextEmpty', () => {
    it('returns true for missing data', () => {
        expect(isRichTextEmpty(null)).toBe(true);
        expect(isRichTextEmpty(undefined)).toBe(true);
        expect(isRichTextEmpty({ root: { children: [] } })).toBe(true);
    });

    it('returns true for a document containing only the editor initial empty paragraph', () => {
        // Lexical's editor seeds new fields with a single empty paragraph
        // — if we treated that as content, every rich-text block would
        // emit an invisible wrapper on otherwise-empty pages.
        expect(
            isRichTextEmpty({
                root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }] },
            }),
        ).toBe(true);
    });

    it('returns false for a non-empty document', () => {
        expect(
            isRichTextEmpty({
                root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'real' }] }] },
            }),
        ).toBe(false);
    });
});
