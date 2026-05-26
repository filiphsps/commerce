/**
 * Minimal builders for Lexical richText documents. Payload validates the
 * `richText` field against the Lexical editor schema, so seed values must
 * round-trip through this shape — bare strings or stripped nodes are
 * rejected with cryptic errors during the `payload.create()` call.
 *
 * Every node carries `version: 1`, `direction: null`, `format: ''`, and
 * `indent: 0` because Lexical's default serializer emits them on every node;
 * omitting them yields a "node failed validation" error at create time.
 */

type LexicalNode = Record<string, unknown>;

/**
 * Wraps the supplied block-level children in a Lexical root document.
 *
 * @param children - Block-level Lexical nodes (paragraphs, headings, lists, …).
 * @returns A complete Lexical document ready to be assigned to a richText field.
 */
export const lexicalDoc = (children: LexicalNode[]): LexicalNode => ({
    root: {
        type: 'root',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children,
    },
});

/**
 * Plain text leaf used inside paragraphs, headings, and list items.
 *
 * @param text - The literal text to render.
 * @returns A Lexical text node.
 */
const text = (text: string): LexicalNode => ({
    type: 'text',
    text,
    detail: 0,
    format: 0,
    mode: 'normal',
    style: '',
    version: 1,
});

/**
 * Single-paragraph block — the default body element.
 *
 * @param value - Paragraph text.
 * @returns A Lexical paragraph node.
 */
export const paragraph = (value: string): LexicalNode => ({
    type: 'paragraph',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
    children: [text(value)],
});

/**
 * Heading block (h1–h4).
 *
 * @param value - Heading text.
 * @param tag - Heading level. Defaults to `h2`.
 * @returns A Lexical heading node.
 */
export const heading = (value: string, tag: 'h1' | 'h2' | 'h3' | 'h4' = 'h2'): LexicalNode => ({
    type: 'heading',
    tag,
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: [text(value)],
});

/**
 * Bulleted or numbered list. Each list-item is a single line of plain text.
 *
 * @param items - Item strings, one per row.
 * @param listType - `'bullet'` for `<ul>`, `'number'` for `<ol>`. Defaults to `'bullet'`.
 * @returns A Lexical list node with its `listitem` children pre-built.
 */
export const list = (items: string[], listType: 'bullet' | 'number' = 'bullet'): LexicalNode => ({
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
