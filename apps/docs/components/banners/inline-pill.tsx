type InlinePillKind = 'deprecated' | 'beta' | 'experimental' | 'internal' | 'new';

const LABELS: Record<InlinePillKind, string> = {
    deprecated: 'Deprecated',
    beta: 'Beta',
    experimental: 'Experimental',
    internal: 'Internal',
    new: 'New',
};

/**
 * Tiny pill next to a symbol h1 or inline in prose. Visualizes the same
 * JSDoc tags that drive page-level banners. Each kind maps to one color from
 * the semantic palette.
 *
 * @param props - The kind of annotation to display.
 * @returns A styled `<span>` pill.
 */
export function InlinePill({ kind }: { kind: InlinePillKind }) {
    return <span className={`inline-pill ${kind}`}>{LABELS[kind]}</span>;
}
