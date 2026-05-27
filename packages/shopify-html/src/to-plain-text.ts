import { type HTMLElement, type Node, NodeType } from 'node-html-parser';
import { normalize } from './normalize';

const BLOCK_TAGS = new Set([
    'p',
    'div',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'br',
    'tr',
    'td',
    'th',
    'blockquote',
]);

/**
 * Recursively accumulates text from a parsed HTML node, flushing to `lines` at block-level element boundaries.
 *
 * @param node - The parsed HTML node to visit.
 * @param lines - Collector for completed line strings; a new entry is pushed each time a block boundary is crossed.
 * @param current - Mutable string accumulator holding text not yet flushed to `lines`.
 */
function walk(node: Node, lines: string[], current: { value: string }): void {
    if (node.nodeType === NodeType.TEXT_NODE) {
        current.value += node.text;
        return;
    }

    if (node.nodeType !== NodeType.ELEMENT_NODE) {
        return;
    }

    const el = node as HTMLElement;
    const tag = el.rawTagName?.toLowerCase();
    const isBlock = !!tag && BLOCK_TAGS.has(tag);

    if (isBlock && current.value.length > 0) {
        lines.push(current.value);
        current.value = '';
    }

    for (const child of el.childNodes) {
        walk(child, lines, current);
    }

    if (isBlock && current.value.length > 0) {
        lines.push(current.value);
        current.value = '';
    }
}

/**
 * Converts a Shopify-origin HTML string to plain text, inserting newlines at block-element boundaries to preserve paragraph structure.
 *
 * @param html - Raw Shopify HTML string to convert; accepts null or undefined.
 * @returns Newline-separated plain-text content, or an empty string when the input is blank or un-parseable.
 * @example
 * ```ts
 * const text = toPlainText('<p>Hello <strong>world</strong></p><p>Another paragraph.</p>');
 * // "Hello world\nAnother paragraph."
 * ```
 */
export function toPlainText(html: string | null | undefined): string {
    const root = normalize(html);
    if (!root) return '';

    const lines: string[] = [];
    const current = { value: '' };

    for (const child of root.childNodes) {
        walk(child, lines, current);
    }

    if (current.value.length > 0) {
        lines.push(current.value);
    }

    return lines
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .join('\n');
}
