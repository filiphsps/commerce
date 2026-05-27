import fs from 'node:fs';
import { isLinkableToken, type ResolveContext, resolveLink, type SymbolIndex } from './jsdoc-link-resolver';

// Minimal inline types for the subset of MDAST we need. The full @types/mdast
// is a transitive dep only — importing it by name would fail tsc.
type InlineCodeNode = { type: 'inlineCode'; value: string };
type LinkNode = {
    type: 'link';
    url: string;
    title: null;
    data?: { hProperties?: Record<string, string> };
    children: { type: 'inlineCode'; value: string }[];
};
type AnyNode = { type: string; children?: AnyNode[]; value?: string };

/**
 * Walk up the ancestor chain looking for a markdown `link` node. Used to skip
 * inline-code rewrites when the code span is already inside a hand-authored
 * link (e.g. `[\`foo\`](./foo)` in an overview table cell), which would
 * otherwise emit an `<a>` inside an `<a>` and trip React hydration.
 *
 * @param ancestors - Stack of MDAST ancestor nodes, root-first.
 * @returns True when any ancestor is a `link` node.
 */
function hasLinkAncestor(ancestors: AnyNode[]): boolean {
    for (const a of ancestors) if (a.type === 'link') return true;
    return false;
}

/**
 * Read the index from disk and cache it for the lifetime of one compile cycle.
 * Tracked by mtime so a `pnpm gen` mid-dev-session is picked up without a
 * server restart: the index module-load in source.config captures the closure
 * once, but this helper sees fresh file mtimes on each transformer call.
 */
let cachedIndex: SymbolIndex = {};
let cachedMtimeMs = 0;
let cachedPath = '';

function loadIndex(indexPath: string): SymbolIndex {
    try {
        const stat = fs.statSync(indexPath);
        if (cachedPath === indexPath && stat.mtimeMs === cachedMtimeMs) {
            return cachedIndex;
        }
        cachedIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as SymbolIndex;
        cachedMtimeMs = stat.mtimeMs;
        cachedPath = indexPath;
        return cachedIndex;
    } catch {
        return {};
    }
}

/**
 * Remark plugin that rewrites inline-code spans into plain `link` mdast nodes
 * when the token resolves through the symbol index. The resolved tab is
 * threaded onto the rendered `<a>` via `data.hProperties.data-symbol-tab` so
 * CSS can pill-style links by target tab.
 *
 * Standard `link` nodes (not `mdxJsxTextElement`) so fumadocs-core's
 * remark-structure plugin handles them like any markdown link.
 *
 * Two configuration modes:
 *   • `{ index, context }` — legacy in-memory index (still used by tests).
 *   • `{ indexPath, context }` — file-backed; re-read on mtime change so
 *     dev-server MDX re-compiles pick up `pnpm gen` output without a restart.
 *
 * @param options - The symbol index source and page context.
 * @returns A unified transformer function that mutates the MDAST in place.
 */
export function remarkLinkSymbols(options: {
    index?: SymbolIndex;
    indexPath?: string;
    context: ResolveContext;
}): (tree: unknown) => void {
    return (tree) => {
        const index = options.indexPath ? loadIndex(options.indexPath) : (options.index ?? {});
        if (Object.keys(index).length === 0) return;
        visitInlineCode(tree as AnyNode, (node, idx, parent, ancestors) => {
            if (parent.type === 'link' || hasLinkAncestor(ancestors)) return;
            if (!isLinkableToken(node.value)) return;
            const res = resolveLink(index, node.value, options.context);
            if (!res) return;
            const replacement: LinkNode = {
                type: 'link',
                url: res.url,
                title: null,
                data: { hProperties: { 'data-symbol-tab': res.tab } },
                children: [{ type: 'inlineCode', value: node.value }],
            };
            if (parent?.children && typeof idx === 'number') {
                parent.children[idx] = replacement as unknown as AnyNode;
            }
        });
    };
}

/**
 * Walk the MDAST tree and invoke `cb` for every `inlineCode` node, passing the
 * node, its index within its parent's children array, the parent itself, and
 * the root-first ancestor chain (excluding the parent). Ancestor tracking
 * lets callers skip rewrites whose result would nest inside an existing
 * link or other context-sensitive element.
 *
 * @param node - Root or any MDAST node to traverse.
 * @param cb - Callback invoked for each inlineCode node found.
 * @param ancestors - Accumulated ancestor stack (root-first); internal.
 */
function visitInlineCode(
    node: AnyNode,
    cb: (n: InlineCodeNode, idx: number, parent: AnyNode, ancestors: AnyNode[]) => void,
    ancestors: AnyNode[] = [],
): void {
    if (!node?.children) return;
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (!child) continue;
        if (child.type === 'inlineCode' && typeof child.value === 'string') {
            cb(child as InlineCodeNode, i, node, ancestors);
        }
        visitInlineCode(child, cb, [...ancestors, node]);
    }
}
