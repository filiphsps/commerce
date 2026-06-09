import { type LexicalDocument, lexicalToProseMirror } from '@nordcom/commerce-cms/editor/richtext';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isRichTextEmpty, RichText, type RichTextDocument } from './rich-text-renderer';

// The renderer is the gatekeeper for the CMS's ProseMirror JSON. Bugs here
// can either silently drop content (an unhandled node type vanishing) or
// emit invisible empty wrappers around every paragraph. The golden-parity
// suite pins the migration contract: every Lexical fixture from the
// pre-rewrite renderer, converted through the CMSRICH-04 codec, must render
// to the exact DOM the Lexical renderer produced.

const locale = { code: 'en-US' } as never;

// Next.js `Link` component pulls in the full router/shop provider stack
// — too heavy for a renderer unit test. Stub it to a plain anchor; we
// only care that the renderer routes links through `Link` at all, not how
// Link itself renders.
vi.mock('@/components/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
        <a href={href} {...rest}>
            {children}
        </a>
    ),
}));

const lexical = (children: unknown[]): LexicalDocument => ({ root: { children } });

/**
 * One golden-parity case: the Lexical fixture the legacy renderer consumed
 * and the exact `container.innerHTML` it produced (captured by rendering the
 * fixtures through the pre-rewrite renderer in this same happy-dom + Link
 * stub setup, immediately before the ProseMirror rewrite).
 */
type GoldenCase = { fixture: LexicalDocument; html: string };

const GOLDEN: Record<string, GoldenCase> = {
    paragraph: {
        fixture: lexical([{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }]),
        html: '<p>Hello</p>',
    },
    marks: {
        // Lexical FORMAT bitmask: bold=1, italic=2, strike=4, underline=8, code=16.
        fixture: lexical([
            {
                type: 'paragraph',
                children: [
                    { type: 'text', text: 'b', format: 1 },
                    { type: 'text', text: 'i', format: 2 },
                    { type: 'text', text: 'u', format: 8 },
                    { type: 'text', text: 's', format: 4 },
                    { type: 'text', text: 'c', format: 16 },
                    { type: 'text', text: 'bi', format: 3 },
                    { type: 'text', text: 'us', format: 12 },
                ],
            },
        ]),
        html: '<p><strong>b</strong><em>i</em><u>u</u><s>s</s><code>c</code><strong><em>bi</em></strong><u><s>us</s></u></p>',
    },
    headings: {
        fixture: lexical([
            { type: 'heading', tag: 'h1', children: [{ type: 'text', text: 'One' }] },
            { type: 'heading', tag: 'h3', children: [{ type: 'text', text: 'Title' }] },
        ]),
        html: '<h1>One</h1><h3>Title</h3>',
    },
    lists: {
        fixture: lexical([
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
        ]),
        html: '<ol><li>one</li></ol><ul><li>two</li></ul>',
    },
    quote: {
        fixture: lexical([{ type: 'quote', children: [{ type: 'text', text: 'q' }] }]),
        html: '<blockquote>q</blockquote>',
    },
    externalLink: {
        fixture: lexical([
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
        ]),
        html: '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer">click</a></p>',
    },
    internalLink: {
        // Locale-prefixed internal URL — must survive verbatim, trailing slash intact.
        fixture: lexical([
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'link',
                        fields: { url: '/en-US/dresses/' },
                        children: [{ type: 'text', text: 'Dresses' }],
                    },
                ],
            },
        ]),
        html: '<p><a href="/en-US/dresses/">Dresses</a></p>',
    },
    linebreak: {
        fixture: lexical([
            {
                type: 'paragraph',
                children: [{ type: 'text', text: 'a' }, { type: 'linebreak' }, { type: 'text', text: 'b' }],
            },
        ]),
        html: '<p>a<br>b</p>',
    },
    linkMixed: {
        // Lexical wraps a link's children in one element; ProseMirror marks
        // each inline node — the renderer must re-group them into one anchor.
        fixture: lexical([
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'link',
                        fields: { url: 'https://example.com' },
                        children: [
                            { type: 'text', text: 'click ' },
                            { type: 'text', text: 'here', format: 1 },
                        ],
                    },
                ],
            },
        ]),
        html: '<p><a href="https://example.com">click <strong>here</strong></a></p>',
    },
    linkBreak: {
        fixture: lexical([
            {
                type: 'paragraph',
                children: [
                    {
                        type: 'link',
                        fields: { url: 'https://example.com' },
                        children: [{ type: 'text', text: 'a' }, { type: 'linebreak' }, { type: 'text', text: 'b' }],
                    },
                ],
            },
        ]),
        html: '<p><a href="https://example.com">a<br>b</a></p>',
    },
    unsafeLink: {
        // javascript: links drop the anchor but keep the inner text.
        fixture: lexical([
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
        ]),
        html: '<p>click</p>',
    },
};

describe('RichText golden parity (Lexical fixtures → CMSRICH-04 codec → ProseMirror renderer)', () => {
    for (const [name, { fixture, html }] of Object.entries(GOLDEN)) {
        it(`renders ${name} to the pinned pre-rewrite DOM`, () => {
            const document = lexicalToProseMirror(fixture);
            const { container } = render(<RichText data={document} locale={locale} />);
            expect(container.innerHTML).toBe(html);
        });
    }
});

const doc = (content: unknown[]): RichTextDocument => ({ type: 'doc', content }) as RichTextDocument;

describe('RichText', () => {
    it('returns null for an empty document so callers can skip the wrapper', () => {
        expect(RichText({ data: null, locale })).toBeNull();
        expect(RichText({ data: doc([]), locale })).toBeNull();
    });

    it('normalizes Lexical structural list nesting into the nested-sublist DOM', () => {
        // The codec re-homes a nested-list-only Lexical item into the
        // preceding item (Tiptap's canonical shape), so the empty `<li>`
        // wrapper the legacy renderer emitted disappears — pinned here as
        // the one sanctioned DOM difference from the Lexical renderer.
        const document = lexicalToProseMirror(
            lexical([
                {
                    type: 'list',
                    listType: 'bullet',
                    children: [
                        { type: 'listitem', children: [{ type: 'text', text: 'one' }] },
                        {
                            type: 'listitem',
                            children: [
                                {
                                    type: 'list',
                                    listType: 'bullet',
                                    children: [{ type: 'listitem', children: [{ type: 'text', text: 'sub' }] }],
                                },
                            ],
                        },
                    ],
                },
            ]),
        );
        const { container } = render(<RichText data={document} locale={locale} />);
        expect(container.innerHTML).toBe('<ul><li>one<ul><li>sub</li></ul></li></ul>');
    });

    it('renders a horizontal rule', () => {
        const { container } = render(<RichText data={doc([{ type: 'horizontalRule' }])} locale={locale} />);
        expect(container.querySelector('hr')).not.toBeNull();
    });

    it('emits the start attribute only for non-default ordered list starts', () => {
        const { container } = render(
            <RichText
                data={doc([
                    {
                        type: 'orderedList',
                        attrs: { start: 3 },
                        content: [
                            {
                                type: 'listItem',
                                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'three' }] }],
                            },
                        ],
                    },
                ])}
                locale={locale}
            />,
        );
        expect(container.querySelector('ol')?.getAttribute('start')).toBe('3');
    });

    it('keeps multi-paragraph blockquotes as paragraphs (Tiptap-authored shape)', () => {
        const { container } = render(
            <RichText
                data={doc([
                    {
                        type: 'blockquote',
                        content: [
                            { type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
                            { type: 'paragraph', content: [{ type: 'text', text: 'second' }] },
                        ],
                    },
                ])}
                locale={locale}
            />,
        );
        expect(container.querySelectorAll('blockquote > p')).toHaveLength(2);
    });

    it("falls through unknown node types but preserves their children — editors don't lose content", () => {
        const { container } = render(
            <RichText
                data={doc([
                    {
                        type: 'futureUnknownNode',
                        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'survives' }] }],
                    },
                ])}
                locale={locale}
            />,
        );
        expect(container.textContent).toBe('survives');
    });

    it('skips unknown mark types but keeps the text', () => {
        const { container } = render(
            <RichText
                data={doc([
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'kept', marks: [{ type: 'futureUnknownMark' }] }],
                    },
                ])}
                locale={locale}
            />,
        );
        expect(container.querySelector('p')?.textContent).toBe('kept');
    });
});

describe('isRichTextEmpty', () => {
    it('returns true for missing data', () => {
        expect(isRichTextEmpty(null)).toBe(true);
        expect(isRichTextEmpty(undefined)).toBe(true);
        expect(isRichTextEmpty(doc([]))).toBe(true);
    });

    it('returns true for a document containing only the editor initial empty paragraph', () => {
        // Tiptap's canonical empty state — and what the codec emits for an
        // empty Lexical document — is a single empty paragraph. If we
        // treated that as content, every rich-text block would emit an
        // invisible wrapper on otherwise-empty pages.
        expect(isRichTextEmpty(doc([{ type: 'paragraph' }]))).toBe(true);
        expect(isRichTextEmpty(lexicalToProseMirror(lexical([])))).toBe(true);
    });

    it('returns false for a non-empty document', () => {
        expect(isRichTextEmpty(doc([{ type: 'paragraph', content: [{ type: 'text', text: 'real' }] }]))).toBe(false);
    });
});
