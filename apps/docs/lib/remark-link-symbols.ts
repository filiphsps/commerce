import { isLinkableToken, resolveLink, type SymbolIndex, type ResolveContext } from './jsdoc-link-resolver';

// Minimal inline types for the subset of MDAST + unified we need. The full
// @types/mdast and @types/unified packages are transitive deps only — importing
// them by name would fail tsc. These stubs cover precisely what we use.
type InlineCodeNode = { type: 'inlineCode'; value: string };
type MdxJsxAttr = { type: 'mdxJsxAttribute'; name: string; value: string };
type MdxJsxTextNode = {
    type: 'mdxJsxTextElement';
    name: string;
    attributes: MdxJsxAttr[];
    children: unknown[];
};
type AnyNode = { type: string; children?: AnyNode[]; value?: string };

/**
 * Remark plugin that rewrites inline-code spans into `<Link>` MDX nodes when
 * the token resolves through the symbol index. Also handles `{@link X}` text
 * inside summary paragraphs. Runs at MDX compile time.
 *
 * When the symbol index is empty (first run before `pnpm gen`), the plugin is
 * a no-op to avoid blocking cold starts.
 *
 * @param options - The symbol index and page context.
 * @returns A unified transformer function that mutates the MDAST in place.
 */
export function remarkLinkSymbols(options: {
    index: SymbolIndex;
    context: ResolveContext;
}): () => (tree: unknown) => void {
    return () => (tree) => {
        if (Object.keys(options.index).length === 0) return;
        visitInlineCode(tree as AnyNode, (node, idx, parent) => {
            if (!isLinkableToken(node.value)) return;
            const res = resolveLink(options.index, node.value, options.context);
            if (!res) return;
            const href: MdxJsxAttr = { type: 'mdxJsxAttribute', name: 'href', value: res.url };
            const tab: MdxJsxAttr = { type: 'mdxJsxAttribute', name: 'data-symbol-tab', value: res.tab };
            const replacement: MdxJsxTextNode = {
                type: 'mdxJsxTextElement',
                name: 'Link',
                attributes: [href, tab],
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
function visitInlineCode(
    node: AnyNode,
    cb: (n: InlineCodeNode, idx: number, parent: AnyNode) => void,
): void {
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
