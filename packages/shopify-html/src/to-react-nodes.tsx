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
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export type ToReactNodesOptions = {
    /** Override which component to render for a given tag. */
    components?: Partial<Record<keyof JSX.IntrinsicElements, ElementType>>;
};

function convertAttributes(raw: Record<string, string>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [name, value] of Object.entries(raw)) {
        const renamed = ATTR_RENAME[name] ?? name;
        out[renamed] = value;
    }
    return out;
}

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

export function toReactNodes(
    html: string | null | undefined,
    opts: ToReactNodesOptions = {},
): ReactNode {
    const root = normalize(html);
    if (!root) return null;

    const children = root.childNodes
        .map((child, i) => nodeToReact(child, `n${i}`, opts))
        .filter((c) => c !== null && (typeof c !== 'string' || c.trim() !== ''));

    if (children.length === 0) return null;
    if (children.length === 1) return children[0];

    return createElement(Fragment, null, ...children);
}
