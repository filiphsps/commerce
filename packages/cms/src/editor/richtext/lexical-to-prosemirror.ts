import { TypeError } from '@nordcom/commerce-errors';

/**
 * Lossless Lexical-JSON → ProseMirror-JSON codec (CMSRICH-04).
 *
 * Converts the Payload/Lexical rich-text documents stored by the legacy CMS into the
 * ProseMirror document shape the CMSRICH-01 Tiptap widget persists (StarterKit node set —
 * paragraph/heading/blockquote/bulletList/orderedList/listItem/hardBreak/horizontalRule —
 * plus the bold/italic/strike/underline/code/link marks). Consumed by the migration ETL
 * (PIPELINE-02) and the fidelity gate (CMSRICH-03), so it is a pure module: no IO, no
 * Convex imports, no React. Every node and mark type outside the migrated corpus RAISES a
 * typed error — content is never silently dropped.
 */

/** A serialized ProseMirror mark — a type plus its schema-declared attributes. */
export type ProseMirrorMark = {
    /** The mark type name in the CMSRICH-01 Tiptap schema (`bold`, `italic`, `strike`, `underline`, `code`, `link`). */
    type: string;
    /** Mark attributes; only the `link` mark carries any (`href`/`target`/`rel`). */
    attrs?: Record<string, unknown>;
};

/** A serialized ProseMirror node — the JSON shape `editor.getJSON()` emits and `nodeFromJSON` accepts. */
export type ProseMirrorNode = {
    /** The node type name in the CMSRICH-01 Tiptap schema. */
    type: string;
    /** Node attributes (`heading.level`, `orderedList.start`). */
    attrs?: Record<string, unknown>;
    /** Child nodes; omitted for leaf and empty nodes. */
    content?: ProseMirrorNode[];
    /** The literal text of a `text` node. */
    text?: string;
    /** Marks applied to an inline node. */
    marks?: ProseMirrorMark[];
};

/** A serialized ProseMirror document — the root node the rich-text widget binds to a localized bucket. */
export type ProseMirrorDocument = {
    /** Always `'doc'`. */
    type: 'doc';
    /** The document's block-level children; always at least one block so the doc satisfies `block+`. */
    content: ProseMirrorNode[];
};

/** A raw Lexical node as stored in a Payload `richText` field — serializer artifacts and all. */
type LexicalNode = Record<string, unknown>;

/** The stored Lexical document shape: a `root` element wrapping block-level children. */
export type LexicalDocument = {
    /** The Lexical root element. */
    root?: { children?: unknown[] } | null;
} | null;

/**
 * Lexical's text-format bitmask, mirroring the upstream `IS_*` constants the storefront
 * renderer (`apps/storefront/src/blocks/rich-text-renderer.tsx`) decodes. Only the five
 * bits representable in the CMSRICH-01 Tiptap schema are convertible; `SUBSCRIPT` (32),
 * `SUPERSCRIPT` (64), and any future bit have no target mark and raise instead.
 */
const FORMAT = {
    BOLD: 1,
    ITALIC: 1 << 1,
    STRIKETHROUGH: 1 << 2,
    UNDERLINE: 1 << 3,
    CODE: 1 << 4,
} as const;

/** Bitwise union of every convertible format bit; leftovers outside this mask raise. */
const CONVERTIBLE_FORMAT_MASK = FORMAT.BOLD | FORMAT.ITALIC | FORMAT.STRIKETHROUGH | FORMAT.UNDERLINE | FORMAT.CODE;

/**
 * Lexical format bit → ProseMirror mark name, in the canonical emission order. The order is
 * fixed so converted documents are byte-stable across runs — ProseMirror itself sorts mark
 * sets by schema rank on deserialization, so any order validates.
 */
const FORMAT_MARKS: readonly [number, string][] = [
    [FORMAT.BOLD, 'bold'],
    [FORMAT.ITALIC, 'italic'],
    [FORMAT.STRIKETHROUGH, 'strike'],
    [FORMAT.UNDERLINE, 'underline'],
    [FORMAT.CODE, 'code'],
];

/**
 * Narrows an unknown value to a Lexical node record and returns its `type` discriminant.
 *
 * @param value - A candidate child from a Lexical `children` array.
 * @returns The node and its type string.
 * @throws {TypeError} When the value is not an object with a string `type`.
 */
function asLexicalNode(value: unknown): { node: LexicalNode; type: string } {
    if (typeof value !== 'object' || value === null) {
        throw new TypeError(`Lexical child is not a node object (got ${typeof value}).`);
    }
    const node = value as LexicalNode;
    const type = node.type;
    if (typeof type !== 'string') {
        throw new TypeError('Lexical node is missing its "type" discriminant.');
    }
    return { node, type };
}

/**
 * Decodes a Lexical text-format bitmask into the equivalent ProseMirror marks.
 *
 * @param format - The `format` bitmask off a Lexical text node (`0` when unset).
 * @returns Marks in canonical order (bold, italic, strike, underline, code).
 * @throws {TypeError} When the bitmask carries bits with no target mark (e.g. sub/superscript) —
 *   dropping them would silently lose formatting.
 */
function marksFromFormat(format: number): ProseMirrorMark[] {
    const unconvertible = format & ~CONVERTIBLE_FORMAT_MASK;
    if (unconvertible !== 0) {
        throw new TypeError(
            `Lexical text format bits ${unconvertible} have no ProseMirror mark in the rich-text schema.`,
        );
    }
    const marks: ProseMirrorMark[] = [];
    for (const [bit, mark] of FORMAT_MARKS) {
        if (format & bit) marks.push({ type: mark });
    }
    return marks;
}

/**
 * Builds the ProseMirror `link` mark for a Lexical link node. Payload's `LinkFeature` nests
 * the destination under `fields` while a plain Lexical `LinkNode` keeps `url`/`rel`/`target`
 * top-level — both shapes appear in stored documents, so both are read (`fields` wins).
 * Locale-prefixed internal URLs (`/en-US/…`) pass through verbatim: link resolution stays a
 * render-time concern, exactly as the storefront's Lexical renderer treated them. An explicit
 * `rel`/`target` is preserved as-is; otherwise `newTab` derives `target: '_blank'` plus the
 * `rel: 'noopener noreferrer'` the storefront renderer emitted for new-tab links.
 *
 * @param node - The Lexical link node.
 * @returns The `link` mark with `href`, `target`, and `rel` attributes (null when absent).
 * @throws {TypeError} When the node carries no URL — a link without a destination cannot be
 *   represented losslessly as a ProseMirror link mark.
 */
function linkMark(node: LexicalNode): ProseMirrorMark {
    const fields = (typeof node.fields === 'object' && node.fields !== null ? node.fields : {}) as LexicalNode;
    const url = typeof fields.url === 'string' ? fields.url : typeof node.url === 'string' ? node.url : undefined;
    if (!url) {
        throw new TypeError('Lexical link node has no URL to convert into a ProseMirror link mark.');
    }
    const newTab = fields.newTab === true || node.newTab === true;
    const explicitTarget =
        typeof fields.target === 'string' ? fields.target : typeof node.target === 'string' ? node.target : undefined;
    const explicitRel =
        typeof fields.rel === 'string' ? fields.rel : typeof node.rel === 'string' ? node.rel : undefined;
    return {
        type: 'link',
        attrs: {
            href: url,
            target: explicitTarget ?? (newTab ? '_blank' : null),
            rel: explicitRel ?? (newTab ? 'noopener noreferrer' : null),
        },
    };
}

/**
 * Converts a Lexical inline node (text, linebreak, or link wrapper) into ProseMirror inline
 * nodes, threading the accumulated mark set down through link wrappers — Lexical models links
 * as element nodes wrapping text, ProseMirror as a mark on the text itself.
 *
 * @param value - The raw Lexical child.
 * @param marks - Marks inherited from enclosing wrappers (currently only `link`).
 * @returns Zero or more inline ProseMirror nodes. Empty-string text nodes convert to nothing:
 *   ProseMirror forbids empty text nodes and they carry no content, so skipping them is the
 *   lossless encoding of Lexical's empty-editor placeholder.
 * @throws {TypeError} When the child is not an inline node type from the corpus.
 */
function convertInline(value: unknown, marks: ProseMirrorMark[]): ProseMirrorNode[] {
    const { node, type } = asLexicalNode(value);
    switch (type) {
        case 'text': {
            const text = typeof node.text === 'string' ? node.text : '';
            if (text === '') return [];
            const format = typeof node.format === 'number' ? node.format : 0;
            // Format marks precede inherited link marks: ProseMirror's `check()` requires
            // mark sets ordered by schema rank, and the link mark registers after the
            // StarterKit format marks in the CMSRICH-01 extension set.
            const allMarks = [...marksFromFormat(format), ...marks];
            return [allMarks.length > 0 ? { type: 'text', text, marks: allMarks } : { type: 'text', text }];
        }
        case 'linebreak':
            return [marks.length > 0 ? { type: 'hardBreak', marks } : { type: 'hardBreak' }];
        case 'link': {
            const children = Array.isArray(node.children) ? node.children : [];
            const withLink = [...marks, linkMark(node)];
            return children.flatMap((child) => convertInline(child, withLink));
        }
        default:
            throw new TypeError(`Unsupported Lexical inline node type "${type}".`);
    }
}

/**
 * Converts a Lexical `children` array of inline nodes into a ProseMirror `paragraph` node.
 *
 * @param children - Inline Lexical children (possibly absent).
 * @returns A paragraph node; `content` is omitted when empty so the JSON matches what
 *   Tiptap's `getJSON()` emits for an empty paragraph.
 * @throws {TypeError} When a child is not an inline corpus node.
 */
function paragraphFromInline(children: unknown[] | undefined): ProseMirrorNode {
    const content = (children ?? []).flatMap((child) => convertInline(child, []));
    return content.length > 0 ? { type: 'paragraph', content } : { type: 'paragraph' };
}

/**
 * Converts a Lexical heading node, mapping its `tag` (`h1`–`h6`) onto the Tiptap
 * `heading.level` attribute.
 *
 * @param node - The Lexical heading node.
 * @returns The ProseMirror heading node.
 * @throws {TypeError} When the tag is not `h1`–`h6`.
 */
function convertHeading(node: LexicalNode): ProseMirrorNode {
    const tag = node.tag;
    if (typeof tag !== 'string' || !/^h[1-6]$/.test(tag)) {
        throw new TypeError(`Unsupported Lexical heading tag "${String(tag)}".`);
    }
    const level = Number.parseInt(tag.slice(1), 10);
    const children = Array.isArray(node.children) ? node.children : [];
    const content = children.flatMap((child) => convertInline(child, []));
    return content.length > 0 ? { type: 'heading', attrs: { level }, content } : { type: 'heading', attrs: { level } };
}

/**
 * Converts a Lexical list node into a Tiptap `bulletList`/`orderedList`. Lexical encodes
 * nesting structurally — a `listitem` whose children are exclusively nested `list` nodes —
 * while Tiptap nests the sublist inside the PRECEDING `listItem` after its paragraph, so
 * such items are merged into the previous item rather than emitted as empty rows. Item
 * `indent` is not read: depth is fully encoded by the structural nesting, so the structure
 * is the lossless carrier.
 *
 * @param node - The Lexical list node.
 * @returns The ProseMirror list node (`orderedList` carries its `start` attribute).
 * @throws {TypeError} When neither `listType` (`bullet`/`number`) nor the legacy `tag`
 *   (`ul`/`ol`) identifies the list style, or when an item child is not in the corpus.
 */
function convertList(node: LexicalNode): ProseMirrorNode {
    const ordered = node.listType === 'number' || node.tag === 'ol';
    const bullet = node.listType === 'bullet' || node.tag === 'ul';
    if (!ordered && !bullet) {
        throw new TypeError(`Unsupported Lexical list type "${String(node.listType ?? node.tag)}".`);
    }
    const items: ProseMirrorNode[] = [];
    const children = Array.isArray(node.children) ? node.children : [];
    for (const child of children) {
        const { node: item, type } = asLexicalNode(child);
        if (type !== 'listitem') {
            throw new TypeError(`Unsupported Lexical list child type "${type}" (expected "listitem").`);
        }
        const inline: unknown[] = [];
        const nestedLists: ProseMirrorNode[] = [];
        for (const itemChild of Array.isArray(item.children) ? item.children : []) {
            const { node: nested, type: nestedType } = asLexicalNode(itemChild);
            if (nestedType === 'list') {
                nestedLists.push(convertList(nested));
            } else {
                inline.push(itemChild);
            }
        }
        const previous = items[items.length - 1];
        if (inline.length === 0 && nestedLists.length > 0 && previous?.content) {
            previous.content.push(...nestedLists);
            continue;
        }
        items.push({ type: 'listItem', content: [paragraphFromInline(inline), ...nestedLists] });
    }
    if (ordered) {
        const start = typeof node.start === 'number' ? node.start : 1;
        return { type: 'orderedList', attrs: { start }, content: items };
    }
    return { type: 'bulletList', content: items };
}

/**
 * Converts a single block-level Lexical node into its ProseMirror counterpart.
 *
 * @param value - The raw Lexical root child.
 * @returns The converted block node.
 * @throws {TypeError} When the node type is outside the corpus (paragraph, heading, list,
 *   quote, horizontalrule) — unconvertible content raises instead of being dropped.
 */
function convertBlock(value: unknown): ProseMirrorNode {
    const { node, type } = asLexicalNode(value);
    switch (type) {
        case 'paragraph':
            return paragraphFromInline(Array.isArray(node.children) ? node.children : []);
        case 'heading':
            return convertHeading(node);
        case 'list':
            return convertList(node);
        case 'quote':
            // Lexical quotes hold inline children directly; ProseMirror blockquotes hold
            // blocks, so the inline run is wrapped in a single paragraph.
            return {
                type: 'blockquote',
                content: [paragraphFromInline(Array.isArray(node.children) ? node.children : [])],
            };
        case 'horizontalrule':
            return { type: 'horizontalRule' };
        default:
            throw new TypeError(`Unsupported Lexical block node type "${type}".`);
    }
}

/**
 * Converts a stored Lexical rich-text document into the ProseMirror JSON document the
 * CMSRICH-01 Tiptap widget persists. Pure and total over the migrated corpus: any node,
 * mark bit, or malformed shape outside it raises a typed error so the ETL and the fidelity
 * gate fail loudly instead of shipping silently-lossy content.
 *
 * @param document - The `{ root: { children } }` value of a Payload `richText` field.
 * @returns A ProseMirror `doc` whose content always has at least one block (an empty Lexical
 *   document becomes a single empty paragraph — Tiptap's canonical empty state — so the
 *   result satisfies the schema's `block+` content expression).
 * @throws {TypeError} When the document shape is malformed or contains unconvertible content.
 */
export function lexicalToProseMirror(document: LexicalDocument): ProseMirrorDocument {
    if (typeof document !== 'object' || document === null || typeof document.root !== 'object') {
        throw new TypeError('Lexical document is missing its "root" element.');
    }
    const children = document.root?.children ?? [];
    if (!Array.isArray(children)) {
        throw new TypeError('Lexical root "children" is not an array.');
    }
    const content = children.map((child) => convertBlock(child));
    return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph' }] };
}
