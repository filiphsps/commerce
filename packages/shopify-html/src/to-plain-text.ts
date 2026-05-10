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
