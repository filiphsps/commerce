type InlinePillKind = 'deprecated' | 'beta' | 'experimental' | 'internal' | 'new';

const LABELS: Record<InlinePillKind, string> = {
    deprecated: 'Deprecated',
    beta: 'Beta',
    experimental: 'Experimental',
    internal: 'Internal',
    new: 'New',
};

const VARIANT_CLASSES: Record<InlinePillKind, string> = {
    deprecated: 'border-err bg-err/10 text-err',
    beta: 'border-ref bg-ref/10 text-ref',
    experimental: 'border-dashed border-ref text-ref',
    internal: 'border-fg-dim text-fg-mute',
    new: 'border-brand bg-brand/10 text-brand',
};

/**
 * Tiny pill next to a symbol h1 or inline in prose. Visualises the same JSDoc
 * tags that drive page-level banners. Each kind maps to one color from the
 * semantic palette.
 *
 * @param props - The kind of annotation to display.
 * @returns A styled `<span>` pill.
 */
export function InlinePill({ kind }: { kind: InlinePillKind }) {
    return (
        <span
            className={`ml-1.5 inline-block rounded-[4px] border-[0.138rem] px-2 py-0.5 align-middle font-bold font-sans text-[0.6rem] uppercase tracking-[0.16em] ${VARIANT_CLASSES[kind]}`}
        >
            {LABELS[kind]}
        </span>
    );
}
