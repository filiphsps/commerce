import { parse, type HTMLElement } from 'node-html-parser';

const STRIP_TAGS = new Set(['meta', 'script', 'style']);

/**
 * Parse a Shopify HTML string and apply default normalization:
 * - strip <meta>, <script>, <style> elements
 * - drop data-* attributes
 * - collapse non-breaking spaces (raw U+00A0 and &nbsp; entity) to regular spaces
 * - trim outer whitespace
 *
 * Returns the parsed root, or null for empty/invalid input.
 */
export function normalize(html: string | null | undefined): HTMLElement | null {
    if (typeof html !== 'string') return null;

    const trimmed = html.trim();
    if (trimmed.length === 0) return null;

    const collapsed = trimmed.replaceAll(/\u00A0/g, ' ').replaceAll('&nbsp;', ' ');

    const root = parse(collapsed);

    for (const tag of STRIP_TAGS) {
        for (const el of root.querySelectorAll(tag)) {
            el.remove();
        }
    }

    for (const el of root.querySelectorAll('*')) {
        const attrs = Object.keys(el.attributes);
        for (const name of attrs) {
            if (name.startsWith('data-')) {
                el.removeAttribute(name);
            }
        }
    }

    return root;
}
