import fs from 'node:fs';
import { isLinkableToken, type ResolveContext, resolveLink, type SymbolIndex } from './jsdoc-link-resolver';

type Element = {
    type: 'element';
    tagName: string;
    properties?: Record<string, unknown>;
    children?: HastNode[];
};
type Text = { type: 'text'; value: string };
type HastNode =
    | Element
    | Text
    | { type: string; children?: HastNode[]; tagName?: string; properties?: Record<string, unknown>; value?: string };

let cachedIndex: SymbolIndex = {};
let cachedMtimeMs = 0;
let cachedPath = '';

/**
 * Re-read the symbol index when its mtime changes. Same lazy-load pattern as
 * `remarkLinkSymbols` — keeps `pnpm gen` mid-dev session reflected on the
 * next MDX compile without a full server restart.
 *
 * @param indexPath - Absolute path to the generated symbol index JSON.
 * @returns Parsed index, or an empty object when the file is missing.
 */
function loadIndex(indexPath: string): SymbolIndex {
    try {
        const stat = fs.statSync(indexPath);
        if (cachedPath === indexPath && stat.mtimeMs === cachedMtimeMs) return cachedIndex;
        cachedIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as SymbolIndex;
        cachedMtimeMs = stat.mtimeMs;
        cachedPath = indexPath;
        return cachedIndex;
    } catch {
        return {};
    }
}

/**
 * Extract the plain-text content of a hast subtree, concatenating all `text`
 * descendants. Shiki tokens are usually a single `text` child but defensive
 * traversal keeps the helper resilient to plugin reordering.
 *
 * @param node - hast node to traverse.
 * @returns Concatenated text content.
 */
function textOf(node: HastNode): string {
    if (node.type === 'text') return (node as Text).value;
    let out = '';
    for (const c of (node as Element).children ?? []) out += textOf(c);
    return out;
}

/**
 * Determine whether a hast element is a Shiki code block we should rewrite.
 * Shiki emits `<figure class="shiki ...">` containing `<pre><code>` with one
 * `<span class="line">` per source line; each line contains per-token
 * `<span style="--shiki-…">` elements.
 *
 * @param node - Candidate hast element.
 * @returns True for the outer Shiki figure.
 */
function isShikiCodeRoot(node: HastNode): node is Element {
    if (node.type !== 'element') return false;
    const el = node as Element;
    // Shiki's hast root (post `rehypeCode`) is either a <figure class="shiki">
    // or a bare <pre class="shiki"> depending on the wrapper config. Fumadocs
    // wraps the <pre> in a React <CodeBlock> at render time, so during
    // rehype the tree usually only contains the <pre class="shiki">.
    if (el.tagName !== 'pre' && el.tagName !== 'figure') return false;
    const cls = el.properties?.className ?? el.properties?.class;
    if (Array.isArray(cls)) return cls.includes('shiki');
    if (typeof cls === 'string') return cls.split(/\s+/).includes('shiki');
    return false;
}

/**
 * Rehype plugin that turns identifier tokens inside Shiki-rendered code
 * blocks into anchors pointing at their reference page. Walks every Shiki
 * `<figure>` in the hast tree, then descends to the per-token `<span>`s
 * inside `<pre><code>`. When a token's text resolves through the symbol
 * index, the span is replaced with an `<a>` carrying `data-symbol-tab`
 * and `data-symbol-kind` — the same data hooks the inline-prose pills use,
 * so the per-kind colour rules paint the linked token without losing
 * Shiki's syntax-highlight styling (preserved on the anchor's inline
 * `style` and propagated to the inner span).
 *
 * @param options - Path to the symbol index (file-backed, mtime cached) and
 *   the page-level resolve context used for scoring ambiguous tokens.
 * @returns A unified transformer that mutates the hast tree in place.
 */
export function rehypeLinkSymbolsInCode(options: {
    indexPath: string;
    context: ResolveContext;
}): (tree: unknown) => void {
    return (tree) => {
        const index = loadIndex(options.indexPath);
        if (Object.keys(index).length === 0) return;
        walk(tree as HastNode, (node) => {
            if (!isShikiCodeRoot(node)) return;
            visitTokenSpans(node as Element, (span, parent, idx) => {
                const text = textOf(span).trim();
                if (!isLinkableToken(text)) return;
                const res = resolveLink(index, text, options.context);
                if (!res) return;
                // Wrap the original span in an anchor so the inner span keeps
                // its inline Shiki `--shiki-light/--shiki-dark` variables and
                // fumadocs's `code span { color: var(--shiki-…) }` selector
                // still colours the token. Wrapping (not mutating) avoids the
                // selector mismatch that would default the anchor's text to
                // the global link colour.
                const a: Element = {
                    type: 'element',
                    tagName: 'a',
                    properties: {
                        href: res.url,
                        'data-symbol-tab': res.tab,
                        'data-symbol-kind': res.kind,
                        'data-symbol-code-link': '',
                    },
                    children: [span],
                };
                (parent.children as HastNode[])[idx] = a;
            });
        });
    };
}

/**
 * Depth-first walk through a hast tree, invoking `cb` on every node.
 *
 * @param node - Root or any hast node.
 * @param cb - Visitor invoked per node before descent.
 */
function walk(node: HastNode, cb: (n: HastNode) => void): void {
    cb(node);
    for (const c of (node as Element).children ?? []) walk(c, cb);
}

/**
 * Visit every per-token Shiki span inside a `<figure class="shiki">`. These
 * are the `<span style="--shiki-…">` elements two levels deep under
 * `<pre><code>` — wrapped in a `<span class="line">` per source line. Skip
 * the outer line wrappers so callers only see tokens, not whole lines.
 *
 * @param figure - The Shiki figure element.
 * @param cb - Visitor invoked for each token span.
 */
function visitTokenSpans(figure: Element, cb: (span: Element, parent: Element, idx: number) => void): void {
    for (const child of figure.children ?? []) {
        if (child.type !== 'element') continue;
        if ((child as Element).tagName === 'div' || (child as Element).tagName === 'pre') {
            visitTokenSpans(child as Element, cb);
        }
        if ((child as Element).tagName === 'code') {
            visitLines(child as Element, cb);
        }
    }
}

/**
 * Walk lines inside the `<code>` element and emit each token span along
 * with the line it belongs to (parent) and its index within that line —
 * the rewriter swaps the span for an anchor wrapping it, so it needs both
 * to splice the new node into the right slot.
 *
 * @param code - The `<code>` hast element.
 * @param cb - Visitor invoked per token span with `(span, line, indexInLine)`.
 */
function visitLines(code: Element, cb: (span: Element, parent: Element, idx: number) => void): void {
    for (const line of code.children ?? []) {
        if (line.type !== 'element' || (line as Element).tagName !== 'span') continue;
        const lineEl = line as Element;
        const tokens = lineEl.children ?? [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token && token.type === 'element' && (token as Element).tagName === 'span') {
                cb(token as Element, lineEl, i);
            }
        }
    }
}
