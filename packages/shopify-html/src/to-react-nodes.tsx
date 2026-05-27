import { type HTMLElement, type Node, NodeType } from 'node-html-parser';
import { createElement, type ElementType, Fragment, type JSX, type ReactNode } from 'react';
import { normalize } from './normalize';

const ATTR_RENAME: Record<string, string> = {
    class: 'className',
    for: 'htmlFor',
    tabindex: 'tabIndex',
    colspan: 'colSpan',
    rowspan: 'rowSpan',
    accesskey: 'accessKey',
};

const VOID_ELEMENTS = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
]);

/**
 * Options accepted by {@link toReactNodes} that let callers substitute custom React components for specific HTML tags during conversion.
 *
 * @example
 * ```tsx
 * toReactNodes(html, {
 *     components: { a: LinkComponent, img: ResponsiveImage },
 * });
 * ```
 */
export type ToReactNodesOptions = {
    /** Override which component to render for a given tag. */
    components?: Partial<Record<keyof JSX.IntrinsicElements, ElementType>>;
};

/**
 * Translates raw HTML attribute names to their React DOM equivalents, handling cases like `class` → `className` and `for` → `htmlFor`.
 *
 * @param raw - HTML attribute map as returned by the parser.
 * @returns Attribute object with React-compatible property names substituted where applicable.
 */
function convertAttributes(raw: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(raw)) {
        const renamed = ATTR_RENAME[name] ?? name;
        out[renamed] = value;
    }
    return out;
}

/**
 * Converts a single parsed HTML node to a React element, a text string, or null; recurses into child nodes for element nodes.
 *
 * @param node - Parsed HTML node to convert.
 * @param key - React reconciliation key to assign to the created element.
 * @param opts - Conversion options forwarded from the root call, including any tag-level component overrides.
 * @returns A React element for element nodes, the raw text string for text nodes, or null for unrecognized or empty nodes.
 */
function nodeToReact(node: Node, key: string, opts: ToReactNodesOptions): ReactNode {
    if (node.nodeType === NodeType.TEXT_NODE) {
        return node.text;
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) {
        return null;
    }

    const el = node as HTMLElement;
    const tag = el.rawTagName?.toLowerCase();
    if (!tag) return null;

    const Component = (opts.components?.[tag as keyof JSX.IntrinsicElements] ?? tag) as ElementType;
    const props = { ...convertAttributes(el.attributes), key };

    if (VOID_ELEMENTS.has(tag)) {
        return createElement(Component, props);
    }

    const children = el.childNodes
        .map((child, i) => nodeToReact(child, `${key}.${i}`, opts))
        .filter((c) => c !== null && (typeof c !== 'string' || c.trim() !== ''));

    return createElement(Component, props, ...children);
}

/**
 * Parses a Shopify-origin HTML string and returns a React node tree suitable for direct rendering, normalizing HTML attributes and optionally replacing tags with custom React components.
 *
 * @param html - Raw Shopify HTML string to convert; accepts null or undefined.
 * @param opts - Conversion options; supply `components` to replace specific HTML tags with custom React components.
 * @returns A React node wrapping the parsed content, or null when the input is blank or yields no renderable output.
 * @example
 * ```tsx
 * const nodes = toReactNodes(product.descriptionHtml, {
 *     components: { a: LinkComponent },
 * });
 * return <div>{nodes}</div>;
 * ```
 */
export function toReactNodes(html: string | null | undefined, opts: ToReactNodesOptions = {}): ReactNode {
    const root = normalize(html);
    if (!root) return null;

    const children = root.childNodes
        .map((child, i) => nodeToReact(child, `n${i}`, opts))
        .filter((c) => c !== null && (typeof c !== 'string' || c.trim() !== ''));

    if (children.length === 0) return null;
    if (children.length === 1) return children[0];

    return createElement(Fragment, null, ...children);
}
