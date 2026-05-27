import type { Plugin } from 'unified';
import type { Root, InlineCode } from 'mdast';
import type { MdxJsxTextElement, MdxJsxAttribute } from 'mdast-util-mdx-jsx';
import { isLinkableToken, resolveLink, type SymbolIndex, type ResolveContext } from './jsdoc-link-resolver';

/**
 * Remark plugin that rewrites inline-code spans into `<Link>` MDX nodes when
 * the token resolves through the symbol index. Also handles `{@link X}` text
 * inside summary paragraphs. Runs at MDX compile time.
 *
 * When the symbol index is empty (first run before `pnpm gen`), the plugin is
 * a no-op to avoid blocking cold starts.
 *
 * @param options - The symbol index and page context.
 * @returns A unified transformer that mutates the MDAST in place.
 */
export function remarkLinkSymbols(options: { index: SymbolIndex; context: ResolveContext }): Plugin<[], Root> {
    return () => (tree) => {
        if (Object.keys(options.index).length === 0) return;
        visitInlineCode(tree, (node, idx, parent) => {
            if (!isLinkableToken(node.value)) return;
            const res = resolveLink(options.index, node.value, options.context);
            if (!res) return;
            const href: MdxJsxAttribute = { type: 'mdxJsxAttribute', name: 'href', value: res.url };
            const tab: MdxJsxAttribute = { type: 'mdxJsxAttribute', name: 'data-symbol-tab', value: res.tab };
            const replacement: MdxJsxTextElement = {
                type: 'mdxJsxTextElement',
                name: 'Link',
                attributes: [href, tab],
                children: [{ type: 'inlineCode', value: node.value }],
            };
            if (parent && typeof idx === 'number') {
                parent.children[idx] = replacement as unknown as typeof parent.children[number];
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
    node: unknown,
    cb: (n: InlineCode, idx: number, parent: { children: unknown[] }) => void,
): void {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; children?: unknown[] };
    if (Array.isArray(n.children)) {
        for (let i = 0; i < n.children.length; i++) {
            const child = n.children[i] as { type?: string };
            if (child?.type === 'inlineCode') {
                cb(child as InlineCode, i, n as { children: unknown[] });
            }
            visitInlineCode(child, cb);
        }
    }
}
