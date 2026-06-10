import { lexicalToProseMirror, type ProseMirrorDocument } from '@nordcom/commerce-cms/editor/richtext';

/**
 * Rich-text builders for the Convex CMS seed fixtures, ported from the Mongo seed's
 * `fixtures/lexical.ts`. The Lexical builders stay the AUTHORING source — the fixture corpus is
 * written as the same Lexical documents the Payload-era seed produced — but every stored body goes
 * through {@link prose}, which runs the real CMSRICH-04 `lexicalToProseMirror` codec, so the seeded
 * rows carry exactly the ProseMirror JSON the migration ETL (PIPELINE-02) would have produced for
 * the same content. The codec throws on anything outside the migrated corpus, so an off-corpus
 * fixture fails the seed at module load instead of seeding silently-lossy content.
 */

/** A raw Lexical node, serializer artifacts and all — the codec's input vocabulary. */
export type LexicalNode = Record<string, unknown>;

/** The stored Lexical document shape: a `root` element wrapping block-level children. */
export type LexicalSeedDocument = { root: { children: LexicalNode[] } & LexicalNode };

/**
 * Wraps the supplied block-level children in a Lexical root document. Every node carries
 * `version: 1`, `direction: null`, `format: ''`, and `indent: 0` because Lexical's default
 * serializer emits them on every node — keeping them preserves byte-parity with the Mongo-era
 * fixture corpus the ETL fidelity gate converts.
 *
 * @param children - Block-level Lexical nodes (paragraphs, headings, lists, …).
 * @returns A complete Lexical document.
 */
export const lexicalDoc = (children: LexicalNode[]): LexicalSeedDocument => ({
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

/**
 * Converts a Lexical authoring run into the stored ProseMirror document via the real CMSRICH-04
 * codec — the single seam every seeded rich-text body crosses, so fixtures cannot drift from what
 * the migration pipeline emits for identical content.
 *
 * @param children - Block-level Lexical nodes from the builders above.
 * @returns The equivalent ProseMirror `doc` JSON.
 * @throws {TypeError} When a node falls outside the codec's migrated corpus.
 */
export const prose = (children: LexicalNode[]): ProseMirrorDocument => lexicalToProseMirror(lexicalDoc(children));
