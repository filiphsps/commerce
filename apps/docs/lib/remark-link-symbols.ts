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
 * Remark plugin that rewrites inline-code spans into plain `link` mdast nodes
 * when the token resolves through the symbol index. The resolved tab is
 * threaded onto the rendered `<a>` via `data.hProperties.data-symbol-tab` so
 * CSS can pill-style links by target tab.
 *
 * Standard `link` nodes (not `mdxJsxTextElement`) so fumadocs-core's
 * remark-structure plugin handles them like any markdown link.
 *
 * @param options - The symbol index and page context.
 * @returns A unified transformer function that mutates the MDAST in place.
 */
export function remarkLinkSymbols(options: { index: SymbolIndex; context: ResolveContext }): (tree: unknown) => void {
    return (tree) => {
        if (Object.keys(options.index).length === 0) return;
        visitInlineCode(tree as AnyNode, (node, idx, parent) => {
            if (!isLinkableToken(node.value)) return;
            const res = resolveLink(options.index, node.value, options.context);
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
 * node, its index within its parent's children array, and the parent itself.
 *
 * @param node - Root or any MDAST node to traverse.
 * @param cb - Callback invoked for each inlineCode node found.
 */
function visitInlineCode(node: AnyNode, cb: (n: InlineCodeNode, idx: number, parent: AnyNode) => void): void {
    if (!node?.children) return;
    for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (!child) continue;
        if (child.type === 'inlineCode' && typeof child.value === 'string') {
            cb(child as InlineCodeNode, i, node);
        }
        visitInlineCode(child, cb);
    }
}
