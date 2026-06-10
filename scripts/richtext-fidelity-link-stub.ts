import { createRequire } from 'node:module';

/**
 * Plain-anchor stand-in for the storefront `@/components/link` component, aliased in by the
 * rich-text fidelity gate (`richtext-fidelity-check.ts`) when it loads the live storefront
 * renderer outside Next.js. It reproduces the exact stub the storefront golden-parity suite
 * (`apps/storefront/src/blocks/rich-text-renderer.test.tsx`) used when the pre-rewrite Lexical
 * DOM was pinned — the real `Link` needs the router/shop provider stack, and the pinned HTML
 * was captured against a bare `<a>` — so the gate's rendered output is comparable to the
 * pinned fixtures byte-for-byte.
 *
 * `react` is resolved at runtime via `createRequire` (the workspace hoists a single React
 * instance, shared with the storefront tree) and typed locally so the scripts `tsc` gate does
 * not depend on `@types/react`.
 */

const { createElement } = createRequire(import.meta.url)('react') as {
    createElement: (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) => unknown;
};

/**
 * Renders the storefront `Link` surface as a plain anchor, forwarding `href` and every other
 * prop (`target`, `rel`) verbatim — mirroring the golden-suite stub.
 *
 * @param props - The link props the storefront renderer passes (`href` plus anchor attributes).
 * @returns A plain `<a>` React element wrapping the children.
 */
export default function Link({
    href,
    children,
    ...rest
}: { href?: unknown; children?: unknown } & Record<string, unknown>): unknown {
    return createElement('a', { href, ...rest }, children);
}
