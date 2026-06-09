import { TypeError } from '@nordcom/commerce-errors';
import { Node, Schema } from 'prosemirror-model';
import { describe, expect, it } from 'vitest';

import {
    type LexicalDocument,
    lexicalToProseMirror,
    type ProseMirrorDocument,
    type ProseMirrorNode,
} from './lexical-to-prosemirror';

// The CMSRICH-01 rich-text widget persists ProseMirror JSON produced by a Tiptap editor
// running StarterKit (paragraph, heading, blockquote, bullet/ordered list, hard break,
// horizontal rule, bold/italic/strike/code) plus the underline and link marks. This schema
// mirrors that extension set's node/mark names and attributes, so `Node.fromJSON(...).check()`
// is a real structural validation of every converted document — not a shape eyeball.
const richTextSchema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*' },
        text: { group: 'inline' },
        heading: { group: 'block', content: 'inline*', attrs: { level: { default: 1 } } },
        blockquote: { group: 'block', content: 'block+' },
        bulletList: { group: 'block', content: 'listItem+' },
        orderedList: { group: 'block', content: 'listItem+', attrs: { start: { default: 1 } } },
        listItem: { content: 'paragraph block*' },
        hardBreak: { group: 'inline', inline: true },
        horizontalRule: { group: 'block' },
    },
    marks: {
        bold: {},
        italic: {},
        strike: {},
        underline: {},
        code: {},
        link: {
            attrs: { href: {}, target: { default: null }, rel: { default: null } },
        },
    },
});

/**
 * Asserts a converted document deserializes and validates against the CMSRICH-01 schema,
 * returning the materialized node so tests can assert on `textContent`.
 *
 * @param doc - The converted ProseMirror JSON document.
 * @returns The validated `prosemirror-model` node.
 * @throws {RangeError} When the document violates the schema (surfaced by `check()`).
 */
const assertValidProseMirror = (doc: ProseMirrorDocument): Node => {
    const node = Node.fromJSON(richTextSchema, doc);
    node.check();
    return node;
};

/**
 * Wraps block-level Lexical children in the serializer's root envelope, including the
 * artifact fields (`version`, `direction`, `format`, `indent`) Lexical emits on every node,
 * mirroring `packages/test-mongo/src/seed/fixtures/lexical.ts`.
 *
 * @param children - Block-level Lexical nodes.
 * @returns A complete stored Lexical document.
 */
const lexicalDoc = (children: unknown[]): LexicalDocument =>
    ({
        root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children },
    }) as LexicalDocument;

/**
 * Builds a Lexical text leaf with the serializer artifact fields present.
 *
 * @param value - The literal text.
 * @param format - The format bitmask (bold=1, italic=2, strikethrough=4, underline=8, code=16).
 * @returns A Lexical text node.
 */
const text = (value: string, format = 0): Record<string, unknown> => ({
    type: 'text',
    text: value,
    detail: 0,
    format,
    mode: 'normal',
    style: '',
    version: 1,
});

/**
 * Builds a Lexical paragraph node matching the seed-fixture serializer shape.
 *
 * @param children - Inline children.
 * @returns A Lexical paragraph node.
 */
const paragraph = (children: unknown[]): Record<string, unknown> => ({
    type: 'paragraph',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
    children,
});

describe('lexicalToProseMirror', () => {
    it('converts a paragraph with plain text', () => {
        const doc = lexicalToProseMirror(lexicalDoc([paragraph([text('Hello world')])]));
        expect(doc).toEqual({
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
        });
        expect(assertValidProseMirror(doc).textContent).toBe('Hello world');
    });

    it.each([1, 2, 3, 4, 5, 6] as const)('converts a heading h%i onto heading.level', (level) => {
        const doc = lexicalToProseMirror(
            lexicalDoc([{ type: 'heading', tag: `h${level}`, version: 1, direction: null, children: [text('Title')] }]),
        );
        expect(doc.content).toEqual([
            { type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'Title' }] },
        ]);
        assertValidProseMirror(doc);
    });

    it.each([
        [1, 'bold'],
        [2, 'italic'],
        [4, 'strike'],
        [8, 'underline'],
        [16, 'code'],
    ])('converts format bit %i to the %s mark', (bit, mark) => {
        const doc = lexicalToProseMirror(lexicalDoc([paragraph([text('styled', bit)])]));
        expect(doc.content[0]?.content?.[0]).toEqual({
            type: 'text',
            text: 'styled',
            marks: [{ type: mark }],
        });
        assertValidProseMirror(doc);
    });

    it('converts a combined format bitmask into every mark in canonical order', () => {
        const doc = lexicalToProseMirror(lexicalDoc([paragraph([text('all', 1 | 2 | 4 | 8 | 16)])]));
        expect(doc.content[0]?.content?.[0]?.marks).toEqual([
            { type: 'bold' },
            { type: 'italic' },
            { type: 'strike' },
            { type: 'underline' },
            { type: 'code' },
        ]);
        assertValidProseMirror(doc);
    });

    it('raises on format bits with no target mark (sub/superscript) instead of dropping them', () => {
        // Lexical's bitmask continues with SUBSCRIPT=32 and SUPERSCRIPT=64; the CMSRICH-01
        // schema has no such marks, so conversion must fail loudly rather than lose styling.
        expect(() => lexicalToProseMirror(lexicalDoc([paragraph([text('sub', 32)])]))).toThrowError(TypeError);
        expect(() => lexicalToProseMirror(lexicalDoc([paragraph([text('sup', 64)])]))).toThrowError(TypeError);
    });

    it('converts a Payload-shaped external link into a link mark with target and rel', () => {
        const doc = lexicalToProseMirror(
            lexicalDoc([
                paragraph([
                    {
                        type: 'link',
                        version: 1,
                        fields: { url: 'https://example.com', newTab: true, linkType: 'custom' },
                        children: [text('click')],
                    },
                ]),
            ]),
        );
        expect(doc.content[0]?.content?.[0]).toEqual({
            type: 'text',
            text: 'click',
            marks: [
                {
                    type: 'link',
                    attrs: { href: 'https://example.com', target: '_blank', rel: 'noopener noreferrer' },
                },
            ],
        });
        assertValidProseMirror(doc);
    });

    it('preserves a locale-prefixed internal link href verbatim', () => {
        const doc = lexicalToProseMirror(
            lexicalDoc([
                paragraph([
                    {
                        type: 'link',
                        version: 1,
                        fields: { url: '/en-US/blog/launch-week/', linkType: 'internal' },
                        children: [text('launch week')],
                    },
                ]),
            ]),
        );
        expect(doc.content[0]?.content?.[0]?.marks).toEqual([
            { type: 'link', attrs: { href: '/en-US/blog/launch-week/', target: null, rel: null } },
        ]);
        assertValidProseMirror(doc);
    });

    it('reads the legacy top-level url/newTab link shape and preserves explicit rel/target', () => {
        const doc = lexicalToProseMirror(
            lexicalDoc([
                paragraph([
                    {
                        type: 'link',
                        version: 1,
                        url: 'https://nordcom.io/',
                        rel: 'sponsored',
                        target: '_parent',
                        children: [text('legacy')],
                    },
                ]),
            ]),
        );
        expect(doc.content[0]?.content?.[0]?.marks).toEqual([
            { type: 'link', attrs: { href: 'https://nordcom.io/', target: '_parent', rel: 'sponsored' } },
        ]);
        assertValidProseMirror(doc);
    });

    it('combines link marks with text format marks on the wrapped text', () => {
        const doc = lexicalToProseMirror(
            lexicalDoc([
                paragraph([
                    {
                        type: 'link',
                        version: 1,
                        fields: { url: 'https://example.com' },
                        children: [text('bold link', 1)],
                    },
                ]),
            ]),
        );
        const marks = doc.content[0]?.content?.[0]?.marks ?? [];
        expect(marks.map((mark) => mark.type)).toEqual(['bold', 'link']);
        assertValidProseMirror(doc);
    });

    it('raises on a link node without a URL — a destination-less link mark is unrepresentable', () => {
        expect(() =>
            lexicalToProseMirror(
                lexicalDoc([paragraph([{ type: 'link', version: 1, fields: {}, children: [text('dead')] }])]),
            ),
        ).toThrowError(TypeError);
    });

    it('converts bullet and numbered lists, keeping the ordered start attribute', () => {
        const listitem = (value: string, index: number): Record<string, unknown> => ({
            type: 'listitem',
            value: index,
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [text(value)],
        });
        const doc = lexicalToProseMirror(
            lexicalDoc([
                { type: 'list', listType: 'bullet', tag: 'ul', start: 1, children: [listitem('a', 1)] },
                { type: 'list', listType: 'number', tag: 'ol', start: 3, children: [listitem('b', 3)] },
            ]),
        );
        expect(doc.content).toEqual([
            {
                type: 'bulletList',
                content: [
                    { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }] },
                ],
            },
            {
                type: 'orderedList',
                attrs: { start: 3 },
                content: [
                    { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] }] },
                ],
            },
        ]);
        assertValidProseMirror(doc);
    });

    it('recognizes the legacy tag-only list shape (ol/ul without listType)', () => {
        const doc = lexicalToProseMirror(
            lexicalDoc([{ type: 'list', tag: 'ol', children: [{ type: 'listitem', children: [text('one')] }] }]),
        );
        expect(doc.content[0]?.type).toBe('orderedList');
        assertValidProseMirror(doc);
    });

    it('merges a structurally nested Lexical sublist into the preceding listItem (Tiptap nesting)', () => {
        // Lexical nests by emitting a listitem whose only child is the nested list; Tiptap
        // places the sublist inside the previous listItem after its paragraph.
        const doc = lexicalToProseMirror(
            lexicalDoc([
                {
                    type: 'list',
                    listType: 'bullet',
                    children: [
                        { type: 'listitem', indent: 0, children: [text('parent')] },
                        {
                            type: 'listitem',
                            indent: 0,
                            children: [
                                {
                                    type: 'list',
                                    listType: 'bullet',
                                    children: [{ type: 'listitem', indent: 1, children: [text('child')] }],
                                },
                            ],
                        },
                    ],
                },
            ]),
        );
        expect(doc.content).toEqual([
            {
                type: 'bulletList',
                content: [
                    {
                        type: 'listItem',
                        content: [
                            { type: 'paragraph', content: [{ type: 'text', text: 'parent' }] },
                            {
                                type: 'bulletList',
                                content: [
                                    {
                                        type: 'listItem',
                                        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'child' }] }],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ]);
        assertValidProseMirror(doc);
    });

    it('converts a quote into a blockquote wrapping its inline run in a paragraph', () => {
        const doc = lexicalToProseMirror(lexicalDoc([{ type: 'quote', version: 1, children: [text('wisdom')] }]));
        expect(doc.content).toEqual([
            { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'wisdom' }] }] },
        ]);
        assertValidProseMirror(doc);
    });

    it('converts a linebreak into an inline hardBreak', () => {
        const doc = lexicalToProseMirror(
            lexicalDoc([paragraph([text('line one'), { type: 'linebreak', version: 1 }, text('line two')])]),
        );
        expect(doc.content[0]?.content).toEqual([
            { type: 'text', text: 'line one' },
            { type: 'hardBreak' },
            { type: 'text', text: 'line two' },
        ]);
        assertValidProseMirror(doc);
    });

    it('converts a horizontalrule into a horizontalRule block', () => {
        const doc = lexicalToProseMirror(
            lexicalDoc([
                paragraph([text('above')]),
                { type: 'horizontalrule', version: 1 },
                paragraph([text('below')]),
            ]),
        );
        expect(doc.content[1]).toEqual({ type: 'horizontalRule' });
        assertValidProseMirror(doc);
    });

    it('raises a typed error on an unknown block node type instead of dropping it', () => {
        let caught: unknown;
        try {
            lexicalToProseMirror(lexicalDoc([{ type: 'futureUnknownNode', children: [] }]));
        } catch (error) {
            caught = error;
        }
        expect(caught).toBeInstanceOf(TypeError);
        // GenericError carries the descriptive string as `cause`; the offending node type
        // must be named so an ETL failure is actionable.
        expect(String((caught as { cause?: unknown }).cause)).toContain('futureUnknownNode');
    });

    it('raises a typed error on an unknown inline node type instead of dropping it', () => {
        expect(() =>
            lexicalToProseMirror(lexicalDoc([paragraph([{ type: 'mention', version: 1, children: [] }])])),
        ).toThrowError(TypeError);
    });

    it('raises on malformed documents and nodes missing their type discriminant', () => {
        expect(() => lexicalToProseMirror(null)).toThrowError(TypeError);
        expect(() => lexicalToProseMirror({} as LexicalDocument)).toThrowError(TypeError);
        expect(() => lexicalToProseMirror(lexicalDoc(['nonsense']))).toThrowError(TypeError);
        expect(() => lexicalToProseMirror(lexicalDoc([{ children: [] }]))).toThrowError(TypeError);
        expect(() => lexicalToProseMirror(lexicalDoc([{ type: 'heading', tag: 'h7', children: [] }]))).toThrowError(
            TypeError,
        );
        expect(() => lexicalToProseMirror(lexicalDoc([{ type: 'list', children: [] }]))).toThrowError(TypeError);
    });

    it('converts an empty document to the canonical single empty paragraph', () => {
        const doc = lexicalToProseMirror(lexicalDoc([]));
        expect(doc).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
        assertValidProseMirror(doc);
    });

    it("skips Lexical's empty-editor placeholder text node — ProseMirror forbids empty text nodes", () => {
        const doc = lexicalToProseMirror(lexicalDoc([paragraph([text('')])]));
        expect(doc).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
        assertValidProseMirror(doc);
    });

    it('round-trips the seed-fixture corpus losslessly (validated against the schema)', () => {
        // Mirrors the article bodies seeded through the builders in
        // packages/test-mongo/src/seed/fixtures/lexical.ts: heading + paragraphs + lists,
        // every node carrying the serializer artifact fields.
        const heading = (value: string, tag: string): Record<string, unknown> => ({
            type: 'heading',
            tag,
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: [text(value)],
        });
        const list = (items: string[], listType: 'bullet' | 'number'): Record<string, unknown> => ({
            type: 'list',
            listType,
            start: 1,
            tag: listType === 'bullet' ? 'ul' : 'ol',
            version: 1,
            direction: null,
            format: '',
            indent: 0,
            children: items.map((value, index) => ({
                type: 'listitem',
                value: index + 1,
                version: 1,
                direction: null,
                format: '',
                indent: 0,
                children: [text(value)],
            })),
        });
        const corpus = lexicalDoc([
            heading('Launch week', 'h2'),
            paragraph([text('We shipped '), text('five', 1), text(' things.')]),
            list(['Monday', 'Tuesday', 'Wednesday'], 'bullet'),
            list(['First', 'Second'], 'number'),
            paragraph([text('Read more on '), text('the changelog', 8)]),
        ]);

        const doc = lexicalToProseMirror(corpus);
        const node = assertValidProseMirror(doc);
        // Lossless: every character of every text leaf survives, in order.
        expect(node.textContent).toBe(
            'Launch weekWe shipped five things.MondayTuesdayWednesdayFirstSecondRead more on the changelog',
        );
        const blockTypes = doc.content.map((block: ProseMirrorNode) => block.type);
        expect(blockTypes).toEqual(['heading', 'paragraph', 'bulletList', 'orderedList', 'paragraph']);
    });
});
