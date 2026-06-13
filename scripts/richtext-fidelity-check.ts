#!/usr/bin/env tsx
/**
 * G-RICH fidelity gate (CMSRICH-03): proves the Lexical→ProseMirror codec plus the ETL shred lose
 * ZERO semantic content across the entire available rich-text corpus before any CMS content
 * cutover.
 *
 * For EVERY rich-text value the gate can find it:
 *   1. converts the Lexical source through the REAL CMSRICH-04 codec — the exact module the ETL's
 *      `etl/transform/shred-richtext.ts` imports;
 *   2. renders the Lexical side through the pre-rewrite render oracle (see
 *      {@link renderLexicalOracleHtml}; the deleted Lexical renderer's DOM contract survives as the
 *      pinned golden fixtures in `apps/storefront/src/blocks/rich-text-renderer.test.tsx`, and the
 *      oracle is hard-pinned to those fixtures on every run);
 *   3. renders the ProseMirror side through the LIVE storefront renderer
 *      (`apps/storefront/src/blocks/rich-text-renderer.tsx`) via `react-dom/server`;
 *   4. semantic-diffs the two HTML outputs over normalized DOM trees ({@link normalizeRenderedHtml}
 *      documents exactly what the normalization deliberately ignores).
 *
 * Any unconvertible node RAISES into the quarantine list (doc id + field path + node type) and any
 * semantic diff or quarantine exits non-zero — the hard-fail contract. The run is pure and
 * deterministic: corpus ordering derives only from the input, never from wall-clock time.
 *
 * Corpus selection:
 *   - with a dump directory argument (`tsx --tsconfig scripts/tsconfig.json
 *     scripts/richtext-fidelity-check.ts /path/to/dump`, or `RICHTEXT_DUMP_DIR=…`): every `*.jsonl`
 *     mongoexport file in the directory — the PIPELINE-01 export shape and the cutover-time input;
 *   - without one: the in-repo corpus — the storefront golden fixtures, the HARNESS-12 seed-builder
 *     surface, and every HARNESS-12 fixture body (pages, articles, product metadata, collection
 *     metadata), whose builder-authored Lexical sources are recovered and re-verified against the
 *     stored ProseMirror JSON.
 *
 * CUTOVER-04/05/06 are gated on a green run of this script against the PRODUCTION mongoexport dump,
 * not just the in-repo corpus.
 */
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
    type LexicalDocument,
    lexicalToProseMirror,
    type ProseMirrorDocument,
    type ProseMirrorNode,
} from '../packages/cms/src/editor/richtext/lexical-to-prosemirror';
import { TypeError } from '../packages/errors/src/index';
import {
    heading as builderHeading,
    list as builderList,
    paragraph as builderParagraph,
    type LexicalNode,
    lexicalDoc,
} from '../packages/test-convex/src/seed/fixtures/richtext';
import { normalizeExtendedJson } from './etl/transform/index';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPTS_DIR, '..');

/** One rich-text value scheduled for a fidelity check. */
export interface CorpusItem {
    /** Where the value came from (fixture module, builder sweep, or dump file). */
    source: string;
    /** The grouping collection (dump file stem, fixture table, or fixture category). */
    collection: string;
    /** The owning document's identifier (Mongo `_id` hex, fixture slug/handle, or case name). */
    docId: string;
    /** The dot/index path of the rich-text value inside its document. */
    fieldPath: string;
    /** The Lexical source document to convert and render. */
    lexical: LexicalDocument;
    /** The exact pre-rewrite DOM pinned for this fixture, when one exists (golden cases only). */
    pinnedLegacyHtml?: string;
    /** The stored ProseMirror JSON the conversion must reproduce exactly (HARNESS-12 cases only). */
    expectedProseMirror?: ProseMirrorDocument;
}

/** A rich-text value the gate could not convert — surfaced, never dropped. */
export interface QuarantineEntry {
    source: string;
    collection: string;
    docId: string;
    fieldPath: string;
    /** The offending node type (or a structured descriptor like `text.format:32`). */
    nodeType: string;
    /** The failure the codec (or the corpus collector) raised. */
    reason: string;
}

/** One semantic divergence between the Lexical-side and ProseMirror-side renders. */
export interface SemanticDiff {
    source: string;
    collection: string;
    docId: string;
    fieldPath: string;
    /**
     * Which contract broke: the normalized rendered DOM (`rendered-dom`), the oracle's pin against
     * the pre-rewrite golden HTML (`oracle-pin`), or a HARNESS-12 stored ProseMirror mismatch
     * (`stored-prosemirror`).
     */
    kind: 'rendered-dom' | 'oracle-pin' | 'stored-prosemirror';
    expected: string;
    actual: string;
}

/** The aggregated outcome of one fidelity run. */
export interface FidelityResult {
    /** Distinct documents that contributed at least one rich-text value. */
    documents: number;
    /** Rich-text values checked (including quarantined ones). */
    fields: number;
    /** Lexical node occurrences by node type across the corpus. */
    nodeCounts: Record<string, number>;
    /** Inline mark occurrences (format bits plus link wrappers) across the corpus. */
    markCounts: Record<string, number>;
    diffs: SemanticDiff[];
    quarantines: QuarantineEntry[];
}

/** A collected corpus plus its provenance for the report. */
export interface CorpusCollection {
    /** Human-readable corpus label (`in-repo` or the dump directory). */
    label: string;
    /** The enumerated sources that contributed items, with counts. */
    sources: string[];
    items: CorpusItem[];
    /** Values that are already ProseMirror documents (no Lexical source; nothing to convert). */
    proseMirrorNative: number;
    /** Collector-level failures (unparsable dump lines, fixtures outside the builder vocabulary). */
    preQuarantines: QuarantineEntry[];
}

/** The locale handed to the storefront renderer — the same cast the golden suite uses. */
const ORACLE_LOCALE = { code: 'en-US' };

/* -------------------------------------------------------------------------------------------------
 * Lexical render oracle — the pre-rewrite renderer's DOM contract.
 * ---------------------------------------------------------------------------------------------- */

/**
 * Escapes text content the way `Element.innerHTML` (and `renderToStaticMarkup`) serialize it for
 * the characters that matter to the normalized comparison.
 *
 * @param value - The raw text.
 * @returns The escaped text.
 */
const escapeText = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Escapes an attribute value for double-quoted serialization.
 *
 * @param value - The raw attribute value.
 * @returns The escaped value.
 */
const escapeAttr = (value: string): string => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * Mirrors the storefront's `resolveLink` scheme gate (`apps/storefront/src/blocks/resolve-link.ts`):
 * the pre-rewrite renderer dropped anchors whose URL could execute code on click (`javascript:`,
 * `data:`), keeping the inner content — the `unsafeLink` golden fixture pins that behavior.
 *
 * @param raw - The raw URL off the Lexical link node.
 * @returns Whether an anchor may be emitted for the URL.
 */
const isSafeUrl = (raw: string): boolean => {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    if (/^(?:\/|#|\?)/.test(trimmed)) return true;
    return /^(?:https?|mailto|tel):/i.test(trimmed);
};

/**
 * Lexical text-format bits in the legacy renderer's wrapping order (outermost → innermost:
 * `<strong><em><u><s><code>`), matching the `marks` golden fixture.
 */
const ORACLE_MARK_WRAP: readonly [number, string][] = [
    [1, 'strong'],
    [1 << 1, 'em'],
    [1 << 3, 'u'],
    [1 << 2, 's'],
    [1 << 4, 'code'],
];

/**
 * Renders one inline Lexical node (text, linebreak, or link wrapper) to the pre-rewrite HTML.
 *
 * @param node - The raw Lexical inline node.
 * @returns The HTML fragment.
 * @throws {TypeError} When the node type is outside the migrated corpus (the codec raises on the
 *   same vocabulary, so reaching this with convertible input is impossible).
 */
const renderInlineOracle = (node: Record<string, unknown>): string => {
    const type = node.type;
    switch (type) {
        case 'text': {
            const text = typeof node.text === 'string' ? node.text : '';
            if (text === '') return '';
            const format = typeof node.format === 'number' ? node.format : 0;
            let html = escapeText(text);
            for (let i = ORACLE_MARK_WRAP.length - 1; i >= 0; i--) {
                const entry = ORACLE_MARK_WRAP[i];
                if (!entry) continue;
                const [bit, tag] = entry;
                if (format & bit) html = `<${tag}>${html}</${tag}>`;
            }
            return html;
        }
        case 'linebreak':
            return '<br>';
        case 'link': {
            const fields = (typeof node.fields === 'object' && node.fields !== null ? node.fields : {}) as Record<
                string,
                unknown
            >;
            const url = typeof fields.url === 'string' ? fields.url : typeof node.url === 'string' ? node.url : '';
            const children = (Array.isArray(node.children) ? node.children : []) as Record<string, unknown>[];
            const inner = children.map((child) => renderInlineOracle(child)).join('');
            if (!isSafeUrl(url)) return inner;
            const newTab = fields.newTab === true || node.newTab === true;
            const target =
                typeof fields.target === 'string'
                    ? fields.target
                    : typeof node.target === 'string'
                      ? node.target
                      : newTab
                        ? '_blank'
                        : undefined;
            const rel =
                typeof fields.rel === 'string'
                    ? fields.rel
                    : typeof node.rel === 'string'
                      ? node.rel
                      : newTab
                        ? 'noopener noreferrer'
                        : undefined;
            const targetAttr = target === undefined ? '' : ` target="${escapeAttr(target)}"`;
            const relAttr = rel === undefined ? '' : ` rel="${escapeAttr(rel)}"`;
            return `<a href="${escapeAttr(url)}"${targetAttr}${relAttr}>${inner}</a>`;
        }
        default:
            throw new TypeError(`oracle: unsupported Lexical inline node type "${String(type)}".`);
    }
};

/**
 * Renders the inline children of a Lexical block to the pre-rewrite HTML.
 *
 * @param children - The block's `children` array (possibly absent).
 * @returns The concatenated inline HTML.
 */
const renderInlineRunOracle = (children: unknown): string =>
    ((Array.isArray(children) ? children : []) as Record<string, unknown>[])
        .map((child) => renderInlineOracle(child))
        .join('');

/**
 * Renders one block-level Lexical node to the pre-rewrite HTML.
 *
 * The one deliberate deviation from the deleted renderer: a non-default ordered-list `start` is
 * emitted (`<ol start="3">`) even though the legacy DOM never carried the attribute. `start` is
 * semantic content the codec preserves, so the oracle renders it to make a codec or renderer
 * regression that LOSES it fail the gate — strictly stronger than the legacy contract, and inert
 * for the legacy-pinned goldens (none carry a non-default start).
 *
 * @param node - The raw Lexical block node.
 * @returns The HTML fragment.
 * @throws {TypeError} When the node type is outside the migrated corpus.
 */
const renderBlockOracle = (node: Record<string, unknown>): string => {
    const type = node.type;
    switch (type) {
        case 'paragraph':
            return `<p>${renderInlineRunOracle(node.children)}</p>`;
        case 'heading': {
            const tag = typeof node.tag === 'string' ? node.tag : '';
            if (!/^h[1-6]$/.test(tag)) {
                throw new TypeError(`oracle: unsupported Lexical heading tag "${tag}".`);
            }
            return `<${tag}>${renderInlineRunOracle(node.children)}</${tag}>`;
        }
        case 'quote':
            return `<blockquote>${renderInlineRunOracle(node.children)}</blockquote>`;
        case 'horizontalrule':
            return '<hr>';
        case 'list': {
            const ordered = node.listType === 'number' || node.tag === 'ol';
            const bullet = node.listType === 'bullet' || node.tag === 'ul';
            if (!ordered && !bullet) {
                throw new TypeError(`oracle: unsupported Lexical list type "${String(node.listType ?? node.tag)}".`);
            }
            const items = ((Array.isArray(node.children) ? node.children : []) as Record<string, unknown>[])
                .map((item) => {
                    if (item.type !== 'listitem') {
                        throw new TypeError(`oracle: unsupported Lexical list child type "${String(item.type)}".`);
                    }
                    const parts = ((Array.isArray(item.children) ? item.children : []) as Record<string, unknown>[])
                        .map((child) => (child.type === 'list' ? renderBlockOracle(child) : renderInlineOracle(child)))
                        .join('');
                    return `<li>${parts}</li>`;
                })
                .join('');
            if (ordered) {
                const start = typeof node.start === 'number' && node.start !== 1 ? ` start="${node.start}"` : '';
                return `<ol${start}>${items}</ol>`;
            }
            return `<ul>${items}</ul>`;
        }
        default:
            throw new TypeError(`oracle: unsupported Lexical block node type "${String(type)}".`);
    }
};

/**
 * Renders a Lexical document to the exact HTML the pre-rewrite storefront renderer produced — the
 * Lexical-side oracle of the fidelity comparison. The oracle is validated on every run against the
 * pinned golden HTML the storefront suite captured from the real renderer immediately before the
 * ProseMirror rewrite; any drift fails the gate as an `oracle-pin` diff.
 *
 * @param document - The Lexical source document.
 * @returns The pre-rewrite HTML (empty string for an empty document, as the legacy renderer emitted
 *   nothing for an empty root).
 * @throws {TypeError} When the document carries nodes outside the migrated corpus.
 */
export const renderLexicalOracleHtml = (document: LexicalDocument): string => {
    const children = (document?.root?.children ?? []) as Record<string, unknown>[];
    return children.map((child) => renderBlockOracle(child)).join('');
};

/* -------------------------------------------------------------------------------------------------
 * Normalized semantic diff.
 * ---------------------------------------------------------------------------------------------- */

/** A parsed HTML node: an element with sorted attributes, or a text run. */
type HtmlNode = { tag: string; attrs: Record<string, string>; children: HtmlNode[] } | { text: string };

/** Tags serialized without children by both renderers. */
const VOID_TAGS = new Set(['br', 'hr']);

/** Named character references either renderer can emit. */
const NAMED_ENTITIES: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
};

/**
 * Decodes the named and numeric character references in a serialized HTML string.
 *
 * @param value - The serialized text or attribute value.
 * @returns The decoded string.
 * @throws {TypeError} When an unknown named entity is encountered — silently passing one through
 *   could mask a real content difference.
 */
const decodeEntities = (value: string): string =>
    value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
        if (body.startsWith('#x') || body.startsWith('#X'))
            return String.fromCodePoint(Number.parseInt(body.slice(2), 16));
        if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10));
        const named = NAMED_ENTITIES[body.toLowerCase()];
        if (named === undefined) throw new TypeError(`unknown HTML entity in rendered output: ${whole}`);
        return named;
    });

/** Matches one open/close tag with optional double-quoted or bare attributes. */
const TAG_RE = /^<(\/)?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z-]+(?:="[^"]*")?)*)\s*(\/)?>/;

/** Matches one attribute inside a tag's attribute run. */
const ATTR_RE = /([a-zA-Z-]+)(?:="([^"]*)")?/g;

/**
 * Parses machine-generated HTML (the constrained vocabulary both renderers emit) into a tree.
 * Strict on purpose: malformed or unexpected markup throws instead of being skipped, so a renderer
 * change that produces unparsable output fails the gate loudly.
 *
 * @param html - The serialized HTML.
 * @returns The parsed root children.
 * @throws {TypeError} On unbalanced tags or unparsable input.
 */
export const parseRenderedHtml = (html: string): HtmlNode[] => {
    const root: HtmlNode = { tag: '#root', attrs: {}, children: [] };
    const stack: { tag: string; attrs: Record<string, string>; children: HtmlNode[] }[] = [root];
    let rest = html;
    while (rest.length > 0) {
        if (rest.startsWith('<')) {
            const match = TAG_RE.exec(rest);
            if (!match) throw new TypeError(`unparsable rendered HTML at: ${rest.slice(0, 40)}`);
            const [whole, closing, rawTag = '', attrRun = '', selfClosing] = match;
            const tag = rawTag.toLowerCase();
            rest = rest.slice(whole.length);
            if (closing) {
                const top = stack.pop();
                if (!top || top.tag !== tag || stack.length === 0) {
                    throw new TypeError(`unbalanced </${tag}> in rendered HTML.`);
                }
                continue;
            }
            const attrs: Record<string, string> = {};
            for (const attr of attrRun.matchAll(ATTR_RE)) {
                const [, name, value] = attr;
                if (name) attrs[name.toLowerCase()] = decodeEntities(value ?? '');
            }
            const element = { tag, attrs, children: [] as HtmlNode[] };
            const parent = stack[stack.length - 1];
            if (!parent) throw new TypeError('parser stack underflow.');
            parent.children.push(element);
            if (!VOID_TAGS.has(tag) && !selfClosing) stack.push(element);
        } else {
            const end = rest.indexOf('<');
            const raw = end === -1 ? rest : rest.slice(0, end);
            rest = end === -1 ? '' : rest.slice(end);
            const parent = stack[stack.length - 1];
            if (!parent) throw new TypeError('parser stack underflow.');
            parent.children.push({ text: decodeEntities(raw) });
        }
    }
    if (stack.length !== 1) {
        throw new TypeError(`unclosed <${stack[stack.length - 1]?.tag}> in rendered HTML.`);
    }
    return root.children;
};

/** Attributes the normalization deliberately ignores (presentation/runtime artifacts, not content). */
const VOLATILE_ATTRS = new Set(['class', 'style']);

/**
 * Normalizes a parsed node list in place-free passes:
 *
 *   1. adjacent text nodes merge, runs of ASCII whitespace collapse to one space (NBSP is content
 *      and survives), and empty text nodes drop;
 *   2. volatile attributes drop ({@link VOLATILE_ATTRS}, every `data-*` attribute, and a redundant
 *      `start="1"` on `<ol>` — the HTML default);
 *   3. SANCTIONED list-shape difference: a `<li>` whose children are exclusively nested lists merges
 *      into the preceding `<li>` — the legacy renderer mirrored Lexical's structural nesting
 *      (`<li><ul>…</ul></li>` as a sibling row) while the codec re-homes the sublist into the
 *      previous item (Tiptap's canonical shape); the storefront golden suite pins this as the one
 *      sanctioned DOM difference, so both sides canonicalize to the merged shape.
 *
 * @param nodes - The parsed nodes.
 * @returns The normalized nodes.
 */
const normalizeNodes = (nodes: HtmlNode[]): HtmlNode[] => {
    const merged: HtmlNode[] = [];
    for (const node of nodes) {
        if ('text' in node) {
            const previous = merged[merged.length - 1];
            if (previous && 'text' in previous) {
                merged[merged.length - 1] = { text: previous.text + node.text };
                continue;
            }
            merged.push({ text: node.text });
            continue;
        }
        const attrs: Record<string, string> = {};
        for (const [name, value] of Object.entries(node.attrs)) {
            if (VOLATILE_ATTRS.has(name) || name.startsWith('data-')) continue;
            if (node.tag === 'ol' && name === 'start' && value === '1') continue;
            attrs[name] = value;
        }
        merged.push({ tag: node.tag, attrs, children: normalizeNodes(node.children) });
    }
    const collapsed = merged.flatMap((node): HtmlNode[] => {
        if (!('text' in node)) return [node];
        const text = node.text.replace(/[ \t\r\n]+/g, ' ');
        return text === '' ? [] : [{ text }];
    });
    const out: HtmlNode[] = [];
    for (const node of collapsed) {
        if (
            'tag' in node &&
            node.tag === 'li' &&
            node.children.length > 0 &&
            node.children.every((child) => 'tag' in child && (child.tag === 'ul' || child.tag === 'ol'))
        ) {
            const previous = out[out.length - 1];
            if (previous && 'tag' in previous && previous.tag === 'li') {
                previous.children.push(...node.children);
                continue;
            }
        }
        out.push(node);
    }
    return out;
};

/**
 * Serializes a normalized tree back to a canonical string (sorted attributes, escaped text) for
 * comparison and diff display.
 *
 * @param nodes - The normalized nodes.
 * @returns The canonical serialization.
 */
const serializeNodes = (nodes: HtmlNode[]): string =>
    nodes
        .map((node) => {
            if ('text' in node) return escapeText(node.text);
            const attrs = Object.entries(node.attrs)
                .sort(([a], [b]) => (a < b ? -1 : 1))
                .map(([name, value]) => ` ${name}="${escapeAttr(value)}"`)
                .join('');
            if (VOID_TAGS.has(node.tag)) return `<${node.tag}${attrs}/>`;
            return `<${node.tag}${attrs}>${serializeNodes(node.children)}</${node.tag}>`;
        })
        .join('');

/**
 * Reduces rendered HTML to its canonical semantic form for the fidelity comparison.
 *
 * Deliberately ignored (documented contract of the gate):
 *   - attribute order, entity-encoding style, and void-tag self-closing syntax;
 *   - volatile attributes: `class`, `style`, `data-*`, and `start="1"` on `<ol>` (the HTML default);
 *   - runs of ASCII whitespace inside text (collapsed to one space; U+00A0 is preserved);
 *   - the sanctioned nested-list shape difference (see {@link normalizeNodes});
 *   - a document that is exactly one empty `<p>` normalizes to empty: the codec encodes an empty
 *     Lexical document as Tiptap's canonical empty paragraph, the legacy renderer emitted nothing,
 *     and the storefront skips both via `isRichTextEmpty`.
 *
 * Everything else — tag structure, text content, link targets — is compared exactly.
 *
 * @param html - The rendered HTML of either side.
 * @returns The canonical semantic serialization.
 * @throws {TypeError} When the HTML cannot be parsed.
 */
export const normalizeRenderedHtml = (html: string): string => {
    const normalized = normalizeNodes(parseRenderedHtml(html));
    if (normalized.length === 1) {
        const only = normalized[0];
        if (only && 'tag' in only && only.tag === 'p' && only.children.length === 0) return '';
    }
    return serializeNodes(normalized);
};

/* -------------------------------------------------------------------------------------------------
 * Quarantine classification.
 * ---------------------------------------------------------------------------------------------- */

/** Lexical format bits the codec can represent, mirroring its `CONVERTIBLE_FORMAT_MASK`. */
const CONVERTIBLE_FORMAT_MASK = 0b11111;

/** Mark names per convertible format bit, for the corpus census. */
const FORMAT_BIT_NAMES: readonly [number, string][] = [
    [1, 'bold'],
    [1 << 1, 'italic'],
    [1 << 2, 'strike'],
    [1 << 3, 'underline'],
    [1 << 4, 'code'],
];

/**
 * Walks a Lexical document for the first node the codec cannot convert and returns a stable
 * descriptor for the quarantine report (`relationship`, `text.format:32`, `heading.tag:h7`, …).
 *
 * @param document - The Lexical document that failed conversion.
 * @returns The descriptor, or `malformed-document` when the failure is structural.
 */
export const firstUnconvertibleNodeType = (document: LexicalDocument): string => {
    const children = document?.root?.children;
    if (!Array.isArray(children)) return 'malformed-document';
    const visitInline = (node: Record<string, unknown>): string | null => {
        const type = node.type;
        if (type === 'text') {
            const format = typeof node.format === 'number' ? node.format : 0;
            const leftover = format & ~CONVERTIBLE_FORMAT_MASK;
            return leftover === 0 ? null : `text.format:${leftover}`;
        }
        if (type === 'linebreak') return null;
        if (type === 'link') {
            const fields = (typeof node.fields === 'object' && node.fields !== null ? node.fields : {}) as Record<
                string,
                unknown
            >;
            const url = typeof fields.url === 'string' ? fields.url : typeof node.url === 'string' ? node.url : '';
            if (!url) return 'link.missing-url';
            for (const child of (Array.isArray(node.children) ? node.children : []) as Record<string, unknown>[]) {
                const hit = visitInline(child);
                if (hit) return hit;
            }
            return null;
        }
        return typeof type === 'string' ? type : 'malformed-node';
    };
    const visitBlock = (node: Record<string, unknown>): string | null => {
        const type = node.type;
        const inlineChildren = (Array.isArray(node.children) ? node.children : []) as Record<string, unknown>[];
        switch (type) {
            case 'paragraph':
            case 'quote': {
                for (const child of inlineChildren) {
                    const hit = visitInline(child);
                    if (hit) return hit;
                }
                return null;
            }
            case 'heading': {
                const tag = node.tag;
                if (typeof tag !== 'string' || !/^h[1-6]$/.test(tag)) return `heading.tag:${String(tag)}`;
                for (const child of inlineChildren) {
                    const hit = visitInline(child);
                    if (hit) return hit;
                }
                return null;
            }
            case 'horizontalrule':
                return null;
            case 'list': {
                if (
                    node.listType !== 'number' &&
                    node.listType !== 'bullet' &&
                    node.tag !== 'ol' &&
                    node.tag !== 'ul'
                ) {
                    return `list.listType:${String(node.listType ?? node.tag)}`;
                }
                for (const item of inlineChildren) {
                    if (item.type !== 'listitem') return typeof item.type === 'string' ? item.type : 'malformed-node';
                    for (const child of (Array.isArray(item.children) ? item.children : []) as Record<
                        string,
                        unknown
                    >[]) {
                        const hit = child.type === 'list' ? visitBlock(child) : visitInline(child);
                        if (hit) return hit;
                    }
                }
                return null;
            }
            default:
                return typeof type === 'string' ? type : 'malformed-node';
        }
    };
    for (const child of children as Record<string, unknown>[]) {
        if (typeof child !== 'object' || child === null) return 'malformed-node';
        const hit = visitBlock(child);
        if (hit) return hit;
    }
    return 'unknown';
};

/**
 * Counts Lexical node and mark occurrences into the corpus census, tolerating any shape (the census
 * also covers quarantined documents).
 *
 * @param document - The Lexical document to count.
 * @param nodeCounts - Node-type counters to increment.
 * @param markCounts - Mark counters to increment.
 */
const countLexical = (
    document: LexicalDocument,
    nodeCounts: Record<string, number>,
    markCounts: Record<string, number>,
): void => {
    const visit = (value: unknown): void => {
        if (Array.isArray(value)) {
            for (const child of value) visit(child);
            return;
        }
        if (typeof value !== 'object' || value === null) return;
        const node = value as Record<string, unknown>;
        if (typeof node.type === 'string') {
            nodeCounts[node.type] = (nodeCounts[node.type] ?? 0) + 1;
            if (node.type === 'link') markCounts.link = (markCounts.link ?? 0) + 1;
            if (node.type === 'text' && typeof node.format === 'number') {
                for (const [bit, name] of FORMAT_BIT_NAMES) {
                    if (node.format & bit) markCounts[name] = (markCounts[name] ?? 0) + 1;
                }
            }
        }
        if (Array.isArray(node.children)) visit(node.children);
    };
    visit(document?.root?.children ?? []);
};

/* -------------------------------------------------------------------------------------------------
 * The check core.
 * ---------------------------------------------------------------------------------------------- */

/**
 * Structural deep equality over JSON-shaped values (objects, arrays, primitives).
 *
 * @param a - First value.
 * @param b - Second value.
 * @returns Whether the values are structurally identical.
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) return true;
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
    }
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
        const aKeys = Object.keys(a as Record<string, unknown>).sort();
        const bKeys = Object.keys(b as Record<string, unknown>).sort();
        if (!deepEqual(aKeys, bKeys)) return false;
        return aKeys.every((key) =>
            deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
        );
    }
    return false;
};

/** Renders a ProseMirror document to HTML — the live storefront render path, injected for purity. */
export type ProseMirrorRenderer = (document: ProseMirrorDocument) => string;

/**
 * Runs the fidelity check over a collected corpus: every item converts through the real codec,
 * renders on both sides, and semantic-diffs; failures accumulate as diffs/quarantines without
 * aborting the run, so one report covers the whole corpus.
 *
 * @param items - The corpus items (collector-sorted; the function preserves order).
 * @param renderProseMirror - The live ProseMirror render path (see {@link loadProseMirrorRenderer}).
 * @returns The aggregated result.
 */
export const runFidelityCheck = (
    items: readonly CorpusItem[],
    renderProseMirror: ProseMirrorRenderer,
): FidelityResult => {
    const nodeCounts: Record<string, number> = {};
    const markCounts: Record<string, number> = {};
    const diffs: SemanticDiff[] = [];
    const quarantines: QuarantineEntry[] = [];
    const documents = new Set<string>();

    for (const item of items) {
        documents.add(`${item.collection} ${item.docId}`);
        countLexical(item.lexical, nodeCounts, markCounts);

        let converted: ProseMirrorDocument;
        let lexicalHtml: string;
        try {
            converted = lexicalToProseMirror(item.lexical);
            lexicalHtml = renderLexicalOracleHtml(item.lexical);
        } catch (error: unknown) {
            quarantines.push({
                source: item.source,
                collection: item.collection,
                docId: item.docId,
                fieldPath: item.fieldPath,
                nodeType: firstUnconvertibleNodeType(item.lexical),
                reason: reasonOf(error),
            });
            continue;
        }

        if (item.pinnedLegacyHtml !== undefined && lexicalHtml !== item.pinnedLegacyHtml) {
            diffs.push({
                source: item.source,
                collection: item.collection,
                docId: item.docId,
                fieldPath: item.fieldPath,
                kind: 'oracle-pin',
                expected: item.pinnedLegacyHtml,
                actual: lexicalHtml,
            });
            continue;
        }

        if (item.expectedProseMirror !== undefined && !deepEqual(converted, item.expectedProseMirror)) {
            diffs.push({
                source: item.source,
                collection: item.collection,
                docId: item.docId,
                fieldPath: item.fieldPath,
                kind: 'stored-prosemirror',
                expected: JSON.stringify(item.expectedProseMirror),
                actual: JSON.stringify(converted),
            });
            continue;
        }

        const expected = normalizeRenderedHtml(lexicalHtml);
        const actual = normalizeRenderedHtml(renderProseMirror(converted));
        if (expected !== actual) {
            diffs.push({
                source: item.source,
                collection: item.collection,
                docId: item.docId,
                fieldPath: item.fieldPath,
                kind: 'rendered-dom',
                expected,
                actual,
            });
        }
    }

    return { documents: documents.size, fields: items.length, nodeCounts, markCounts, diffs, quarantines };
};

/**
 * Extracts a printable failure reason from a thrown codec error — same contract as the ETL's
 * `reasonOf`: `@nordcom/commerce-errors` `TypeError` keeps the descriptive string on `cause`.
 *
 * @param error - The caught value.
 * @returns The failure message.
 */
const reasonOf = (error: unknown): string => {
    if (error instanceof Error) {
        if (error.message.length > 0) return error.message;
        if (typeof error.cause === 'string' && error.cause.length > 0) return error.cause;
        const details = (error as { details?: unknown }).details;
        if (typeof details === 'string' && details.length > 0) return details;
    }
    return String(error);
};

/* -------------------------------------------------------------------------------------------------
 * Live ProseMirror render path.
 * ---------------------------------------------------------------------------------------------- */

/**
 * Loads the LIVE storefront ProseMirror renderer (`apps/storefront/src/blocks/rich-text-renderer`)
 * and binds it to `react-dom/server`'s `renderToStaticMarkup` — the same render-to-string setup the
 * storefront golden suite runs under. The renderer's `@/components/link` import resolves to the
 * gate's plain-anchor stub (via `scripts/tsconfig.json` paths under tsx, or the scripts Vitest
 * alias), matching the environment the pre-rewrite DOM was pinned in. React and `react-dom` resolve
 * from the storefront's own dependency tree so the element and the server renderer share one React
 * instance.
 *
 * @returns The bound render function.
 */
export const loadProseMirrorRenderer = async (): Promise<ProseMirrorRenderer> => {
    const storefrontDir = resolve(REPO_ROOT, 'apps/storefront');
    const rendererPath = resolve(storefrontDir, 'src/blocks/rich-text-renderer.tsx');
    const storefrontRequire = createRequire(resolve(storefrontDir, 'package.json'));
    // Under a direct `tsx` run the renderer compiles with the storefront tsconfig's
    // `jsx: "preserve"`, which tsx lowers to the CLASSIC `React.createElement` transform — so the
    // shared React instance must exist as a global before the component executes. Inert under
    // Vitest (the automatic runtime never reads the global).
    (globalThis as { React?: unknown }).React = storefrontRequire('react');
    const rendererModule = (await import(rendererPath)) as {
        RichText: (props: { data: unknown; locale: unknown }) => unknown;
    };
    const { renderToStaticMarkup } = storefrontRequire('react-dom/server') as {
        renderToStaticMarkup: (node: unknown) => string;
    };
    const { createElement } = storefrontRequire('react') as {
        createElement: (type: unknown, props: Record<string, unknown>) => unknown;
    };
    return (document) =>
        renderToStaticMarkup(createElement(rendererModule.RichText, { data: document, locale: ORACLE_LOCALE }));
};

/* -------------------------------------------------------------------------------------------------
 * Corpus collection — in-repo.
 * ---------------------------------------------------------------------------------------------- */

/**
 * Builds a Lexical fixture document from bare children, in the storefront golden suite's shorthand.
 *
 * @param children - Block-level Lexical children.
 * @returns The Lexical document.
 */
const goldenLexical = (children: unknown[]): LexicalDocument => ({ root: { children } });

/**
 * The storefront golden-parity corpus, copied VERBATIM from
 * `apps/storefront/src/blocks/rich-text-renderer.test.tsx` (`GOLDEN`): each fixture is paired with
 * the exact `container.innerHTML` the PRE-REWRITE Lexical renderer produced. The pinned HTML doubles
 * as the oracle's self-check — if {@link renderLexicalOracleHtml} ever drifts from the deleted
 * renderer's contract, every golden item fails as an `oracle-pin` diff. Keep in lockstep with the
 * storefront suite.
 *
 * @returns The golden corpus items, sorted by case name.
 */
export const collectGoldenCorpus = (): CorpusItem[] => {
    const cases: Record<string, { fixture: LexicalDocument; html?: string }> = {
        paragraph: {
            fixture: goldenLexical([{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }]),
            html: '<p>Hello</p>',
        },
        marks: {
            fixture: goldenLexical([
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
            fixture: goldenLexical([
                { type: 'heading', tag: 'h1', children: [{ type: 'text', text: 'One' }] },
                { type: 'heading', tag: 'h3', children: [{ type: 'text', text: 'Title' }] },
            ]),
            html: '<h1>One</h1><h3>Title</h3>',
        },
        lists: {
            fixture: goldenLexical([
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
            fixture: goldenLexical([{ type: 'quote', children: [{ type: 'text', text: 'q' }] }]),
            html: '<blockquote>q</blockquote>',
        },
        externalLink: {
            fixture: goldenLexical([
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
            fixture: goldenLexical([
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
            fixture: goldenLexical([
                {
                    type: 'paragraph',
                    children: [{ type: 'text', text: 'a' }, { type: 'linebreak' }, { type: 'text', text: 'b' }],
                },
            ]),
            html: '<p>a<br>b</p>',
        },
        linkMixed: {
            fixture: goldenLexical([
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
            fixture: goldenLexical([
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
            fixture: goldenLexical([
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
        // The sanctioned nested-list shape difference: pinned semantically (no `html`), since the
        // legacy DOM (`<li><ul>…</ul></li>` sibling row) and the codec's re-homed shape normalize
        // to the same canonical tree.
        nestedList: {
            fixture: goldenLexical([
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
        },
    };
    return Object.entries(cases)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([name, { fixture, html }]) => ({
            source: 'apps/storefront/src/blocks/rich-text-renderer.test.tsx',
            collection: 'storefront-golden',
            docId: name,
            fieldPath: 'fixture',
            lexical: fixture,
            ...(html === undefined ? {} : { pinnedLegacyHtml: html }),
        }));
};

/**
 * The HARNESS-12 seed-builder sweep: one corpus item per builder surface
 * (`packages/test-convex/src/seed/fixtures/richtext.ts` — `paragraph`, `heading` h1–h4, `list`
 * bullet/number, plus a composite document), authored through the REAL builders so the sweep is
 * exactly the vocabulary every HARNESS-12 fixture body is written in.
 *
 * @returns The builder-sweep corpus items, sorted by case name.
 */
export const collectBuilderCorpus = (): CorpusItem[] => {
    const cases: Record<string, LexicalNode[]> = {
        'composite-document': [
            builderHeading('Care and repair', 'h2'),
            builderParagraph('Wool wants airing, not washing. When in doubt, hang it outside overnight.'),
            builderList(['Air after every few wears.', 'Spot-clean with cold water.', 'Dry flat, away from heat.']),
            builderParagraph('Repairs are free for life — see the lifetime guarantee.'),
        ],
        'heading-h1': [builderHeading('Heading level one', 'h1')],
        'heading-h2': [builderHeading('Heading level two', 'h2')],
        'heading-h3': [builderHeading('Heading level three', 'h3')],
        'heading-h4': [builderHeading('Heading level four', 'h4')],
        'list-bullet': [builderList(['First bullet.', 'Second bullet.', 'Third bullet.'])],
        'list-number': [builderList(['Step one.', 'Step two.'], 'number')],
        'paragraph-empty': [builderParagraph('')],
        'paragraph-plain': [builderParagraph('A plain paragraph straight from the seed builders.')],
    };
    return Object.entries(cases)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([name, children]) => ({
            source: 'packages/test-convex/src/seed/fixtures/richtext.ts',
            collection: 'seed-builders',
            docId: name,
            fieldPath: 'document',
            lexical: lexicalDoc(children),
        }));
};

/**
 * Recovers the builder-authored Lexical source of a stored HARNESS-12 ProseMirror document by
 * inverting the builder vocabulary (plain-text paragraphs, h1–h4 headings, single-level lists).
 * The recovery is verified downstream: the recovered source must re-convert to EXACTLY the stored
 * ProseMirror JSON ({@link CorpusItem.expectedProseMirror}), so an incorrect inverse can never
 * fake a pass.
 *
 * @param document - The stored ProseMirror document.
 * @returns The builder children, or `null` when the document falls outside the builder vocabulary.
 */
export const builderSourceFromProse = (document: ProseMirrorDocument): LexicalNode[] | null => {
    const plainText = (content: ProseMirrorNode[] | undefined): string | null => {
        if (content === undefined || content.length === 0) return '';
        if (content.length !== 1) return null;
        const only = content[0];
        if (only?.type !== 'text' || typeof only.text !== 'string' || only.marks !== undefined) return null;
        return only.text;
    };
    const children: LexicalNode[] = [];
    for (const block of document.content) {
        switch (block.type) {
            case 'paragraph': {
                const text = plainText(block.content);
                if (text === null) return null;
                children.push(builderParagraph(text));
                break;
            }
            case 'heading': {
                const level = block.attrs?.level;
                if (level !== 1 && level !== 2 && level !== 3 && level !== 4) return null;
                const text = plainText(block.content);
                if (text === null) return null;
                children.push(builderHeading(text, `h${level}` as 'h1' | 'h2' | 'h3' | 'h4'));
                break;
            }
            case 'bulletList':
            case 'orderedList': {
                if (block.type === 'orderedList' && block.attrs?.start !== 1) return null;
                const items: string[] = [];
                for (const item of block.content ?? []) {
                    if (item.type !== 'listItem' || item.content?.length !== 1) return null;
                    const paragraph = item.content[0];
                    if (paragraph?.type !== 'paragraph') return null;
                    const text = plainText(paragraph.content);
                    if (text === null) return null;
                    items.push(text);
                }
                children.push(builderList(items, block.type === 'orderedList' ? 'number' : 'bullet'));
                break;
            }
            default:
                return null;
        }
    }
    return children;
};

/** The HARNESS-12 fixture modules carrying seeded rich-text bodies. */
const HARNESS_FIXTURE_MODULES: readonly { collection: string; file: string; exportName: string }[] = [
    { collection: 'articles', file: 'articles.ts', exportName: 'articleFixtures' },
    { collection: 'collectionMetadata', file: 'collection-metadata.ts', exportName: 'collectionMetadataFixtures' },
    { collection: 'pages', file: 'pages.ts', exportName: 'pageFixtures' },
    { collection: 'productMetadata', file: 'product-metadata.ts', exportName: 'productMetadataFixtures' },
];

/**
 * Deep-walks a fixture row for stored ProseMirror documents, recording each with its dot/index
 * field path.
 *
 * @param value - Any node of the fixture row.
 * @param path - The accumulated field path.
 * @param out - The hit list to append to.
 */
const collectProseDocuments = (
    value: unknown,
    path: string,
    out: { path: string; document: ProseMirrorDocument }[],
): void => {
    if (Array.isArray(value)) {
        value.forEach((child, index) => {
            collectProseDocuments(child, `${path}.${index}`, out);
        });
        return;
    }
    if (typeof value !== 'object' || value === null) return;
    const node = value as Record<string, unknown>;
    if (node.type === 'doc' && Array.isArray(node.content)) {
        out.push({ path, document: node as unknown as ProseMirrorDocument });
        return;
    }
    for (const [key, child] of Object.entries(node))
        collectProseDocuments(child, path === '' ? key : `${path}.${key}`, out);
};

/**
 * Collects the full in-repo corpus: golden fixtures, the seed-builder sweep, and every HARNESS-12
 * fixture body (with its builder-authored Lexical source recovered and pinned against the stored
 * ProseMirror JSON). A fixture body outside the builder vocabulary is a collector-level quarantine
 * — it means the fixture corpus drifted from its documented authoring source and the gate can no
 * longer vouch for it.
 *
 * @returns The collected corpus with provenance.
 */
export const collectInRepoCorpus = async (): Promise<CorpusCollection> => {
    const golden = collectGoldenCorpus();
    const builders = collectBuilderCorpus();
    const harness: CorpusItem[] = [];
    const preQuarantines: QuarantineEntry[] = [];
    const fixturesDir = resolve(REPO_ROOT, 'packages/test-convex/src/seed/fixtures');
    const sources = [
        `apps/storefront/src/blocks/rich-text-renderer.test.tsx (golden parity fixtures): ${golden.length} fixtures`,
        `packages/test-convex/src/seed/fixtures/richtext.ts (seed-builder sweep): ${builders.length} documents`,
    ];

    for (const { collection, file, exportName } of HARNESS_FIXTURE_MODULES) {
        const fixtureModule = (await import(resolve(fixturesDir, file))) as Record<string, unknown>;
        const rows = fixtureModule[exportName];
        if (!Array.isArray(rows)) {
            throw new TypeError(`fixture module ${file} does not export an array "${exportName}".`);
        }
        let bodies = 0;
        rows.forEach((row: Record<string, unknown>, index) => {
            const docId =
                typeof row.slug === 'string'
                    ? row.slug
                    : typeof row.shopifyHandle === 'string'
                      ? row.shopifyHandle
                      : `${exportName}[${index}]`;
            const hits: { path: string; document: ProseMirrorDocument }[] = [];
            collectProseDocuments(row, '', hits);
            for (const hit of hits) {
                bodies += 1;
                const source = `packages/test-convex/src/seed/fixtures/${file}`;
                const recovered = builderSourceFromProse(hit.document);
                if (recovered === null) {
                    preQuarantines.push({
                        source,
                        collection,
                        docId,
                        fieldPath: hit.path,
                        nodeType: 'outside-builder-vocabulary',
                        reason: 'Stored HARNESS-12 ProseMirror body is not expressible in the seed-builder vocabulary; its Lexical authoring source cannot be recovered.',
                    });
                    continue;
                }
                harness.push({
                    source,
                    collection,
                    docId,
                    fieldPath: hit.path,
                    lexical: lexicalDoc(recovered),
                    expectedProseMirror: hit.document,
                });
            }
        });
        sources.push(`packages/test-convex/src/seed/fixtures/${file} (HARNESS-12 ${collection}): ${bodies} bodies`);
    }

    const items = [...golden, ...builders, ...harness].sort((a, b) => (corpusKey(a) < corpusKey(b) ? -1 : 1));
    return { label: 'in-repo', sources, items, proseMirrorNative: 0, preQuarantines };
};

/**
 * Builds the deterministic ordering key of a corpus item.
 *
 * @param item - The corpus item.
 * @returns The sort key.
 */
const corpusKey = (item: CorpusItem): string => `${item.collection} ${item.docId} ${item.fieldPath} ${item.source}`;

/* -------------------------------------------------------------------------------------------------
 * Corpus collection — mongoexport dump (the PIPELINE-01 / cutover-time input).
 * ---------------------------------------------------------------------------------------------- */

/**
 * Collects every Lexical rich-text value from a mongoexport-format dump directory: one `*.jsonl`
 * file per collection, one extended-JSON document per line (the PIPELINE-01 export shape the
 * cutover runs on). Values are found structurally — any object carrying a `root` key anywhere in a
 * document is treated as a Lexical candidate (so a malformed one is quarantined by the codec, never
 * skipped) and any `{ type: 'doc', content: [] }` value is counted as ProseMirror-native (already
 * converted; nothing to verify). Unparsable lines quarantine.
 *
 * @param dumpDir - The dump directory path.
 * @returns The collected corpus with provenance.
 * @throws {Error} When the directory cannot be read or contains no `*.jsonl` files.
 */
export const collectDumpCorpus = (dumpDir: string): CorpusCollection => {
    const files = readdirSync(dumpDir)
        .filter((name) => name.endsWith('.jsonl'))
        .sort();
    if (files.length === 0) {
        throw new TypeError(`no *.jsonl mongoexport files found in ${dumpDir}.`);
    }
    const items: CorpusItem[] = [];
    const preQuarantines: QuarantineEntry[] = [];
    let proseMirrorNative = 0;
    const sources: string[] = [];

    for (const file of files) {
        const collection = file.replace(/\.jsonl$/, '');
        const lines = readFileSync(resolve(dumpDir, file), 'utf8').split('\n');
        let values = 0;
        lines.forEach((line, lineIndex) => {
            if (line.trim() === '') return;
            let raw: unknown;
            try {
                raw = JSON.parse(line);
            } catch (error: unknown) {
                preQuarantines.push({
                    source: file,
                    collection,
                    docId: `${file}:${lineIndex + 1}`,
                    fieldPath: '',
                    nodeType: 'unparsable-json',
                    reason: reasonOf(error),
                });
                return;
            }
            const document = normalizeExtendedJson(raw) as Record<string, unknown>;
            const docId = typeof document._id === 'string' ? document._id : `${file}:${lineIndex + 1}`;
            const walk = (value: unknown, path: string): void => {
                if (Array.isArray(value)) {
                    value.forEach((child, index) => {
                        walk(child, `${path}.${index}`);
                    });
                    return;
                }
                if (typeof value !== 'object' || value === null) return;
                const node = value as Record<string, unknown>;
                if ('root' in node) {
                    values += 1;
                    items.push({
                        source: file,
                        collection,
                        docId,
                        fieldPath: path,
                        lexical: node as LexicalDocument,
                    });
                    return;
                }
                if (node.type === 'doc' && Array.isArray(node.content)) {
                    proseMirrorNative += 1;
                    return;
                }
                for (const [key, child] of Object.entries(node)) walk(child, path === '' ? key : `${path}.${key}`);
            };
            walk(document, '');
        });
        sources.push(`${file}: ${values} rich-text values`);
    }

    items.sort((a, b) => (corpusKey(a) < corpusKey(b) ? -1 : 1));
    return { label: `dump ${dumpDir}`, sources, items, proseMirrorNative, preQuarantines };
};

/* -------------------------------------------------------------------------------------------------
 * Report + CLI.
 * ---------------------------------------------------------------------------------------------- */

/**
 * Formats a fidelity run as the deterministic plain-text report (input-derived ordering only; no
 * timestamps).
 *
 * @param corpus - The collected corpus.
 * @param result - The run result.
 * @returns The report text, ending in `PASS` or `FAIL`.
 */
export const formatRunReport = (corpus: CorpusCollection, result: FidelityResult): string => {
    const quarantines = [...corpus.preQuarantines, ...result.quarantines];
    const lines: string[] = [];
    lines.push(`[richtext-fidelity] corpus: ${corpus.label}`);
    for (const source of corpus.sources) lines.push(`[richtext-fidelity]   - ${source}`);
    lines.push(`[richtext-fidelity] documents=${result.documents} fields=${result.fields}`);
    const counts = (record: Record<string, number>): string =>
        Object.entries(record)
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .map(([key, count]) => `${key}=${count}`)
            .join(' ') || '(none)';
    lines.push(`[richtext-fidelity] nodes: ${counts(result.nodeCounts)}`);
    lines.push(`[richtext-fidelity] marks: ${counts(result.markCounts)}`);
    lines.push(`[richtext-fidelity] prosemirror-native (already converted, skipped)=${corpus.proseMirrorNative}`);
    lines.push(`[richtext-fidelity] semantic diffs: ${result.diffs.length}`);
    for (const diff of result.diffs) {
        lines.push(
            `[richtext-fidelity]   DIFF (${diff.kind}) ${diff.collection}/${diff.docId} @ ${diff.fieldPath} [${diff.source}]`,
        );
        lines.push(`[richtext-fidelity]     expected: ${diff.expected}`);
        lines.push(`[richtext-fidelity]     actual:   ${diff.actual}`);
    }
    lines.push(`[richtext-fidelity] quarantined: ${quarantines.length}`);
    for (const entry of quarantines) {
        lines.push(
            `[richtext-fidelity]   QUARANTINE ${entry.collection}/${entry.docId} @ ${entry.fieldPath} node=${entry.nodeType} [${entry.source}]: ${entry.reason}`,
        );
    }
    lines.push(`[richtext-fidelity] ${result.diffs.length === 0 && quarantines.length === 0 ? 'PASS' : 'FAIL'}`);
    return `${lines.join('\n')}\n`;
};

/**
 * Whether a run failed the hard-fail contract (any semantic diff or quarantine, including
 * collector-level quarantines).
 *
 * @param corpus - The collected corpus.
 * @param result - The run result.
 * @returns `true` when the gate must exit non-zero.
 */
export const isRed = (corpus: CorpusCollection, result: FidelityResult): boolean =>
    result.diffs.length > 0 || result.quarantines.length > 0 || corpus.preQuarantines.length > 0;

/**
 * CLI entry: collects the corpus (dump directory from `argv[2]` or `RICHTEXT_DUMP_DIR`, else the
 * in-repo corpus), runs the gate, prints the report, and exits non-zero on any diff or quarantine.
 *
 * @returns Nothing; sets the process exit code.
 */
const main = async (): Promise<void> => {
    const dumpDir = process.argv[2] ?? process.env.RICHTEXT_DUMP_DIR;
    const renderProseMirror = await loadProseMirrorRenderer();
    const corpus = dumpDir ? collectDumpCorpus(resolve(dumpDir)) : await collectInRepoCorpus();
    const result = runFidelityCheck(corpus.items, renderProseMirror);
    process.stdout.write(formatRunReport(corpus, result));
    process.exitCode = isRed(corpus, result) ? 1 : 0;
};

const thisFile = fileURLToPath(import.meta.url);
const invokedDirectly = process.argv.slice(1).some((arg) => {
    try {
        return realpathSync(resolve(arg)) === realpathSync(thisFile);
    } catch {
        return pathToFileURL(arg).href === import.meta.url;
    }
});

if (invokedDirectly) {
    try {
        await main();
    } catch (error: unknown) {
        console.error(`[richtext-fidelity] failed: ${reasonOf(error)}`);
        process.exit(1);
    }
}
