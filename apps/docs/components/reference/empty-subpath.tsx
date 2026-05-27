type EmptySubpathProps = {
    /** Package workspace slug, e.g. `"cms"`. */
    pkg: string;
    /** Subpath segment, e.g. `"preview"` or `"api"`. */
    subpath: string;
};

/**
 * Empty-state card shown on reference subpath overview pages when every
 * export in the subpath is `@internal` and excluded from the Reference tab.
 * Uses a neutral ∅ icon (no color — not an error, just hidden). Matches the
 * "Subpath overview · empty symbols" pattern in visuals/09-empty-states.html.
 *
 * @param props - Package slug and subpath name.
 * @returns The no-public-exports empty state card.
 */
export function EmptySubpath({ pkg, subpath }: EmptySubpathProps) {
    const pkgHref = `/packages/${pkg}/`;
    return (
        <div className="not-prose my-8 grid max-w-[920px] place-items-start gap-5 rounded-[0.45rem] border-[0.2rem] border-border bg-[radial-gradient(ellipse_at_center_top,var(--color-bg-1)_30%,var(--color-bg))] p-10">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-fg-mute">
                Reference · {pkg} / {subpath}
            </p>

            <div className="flex h-14 w-14 items-center justify-center rounded-full border-[0.2rem] border-fg-dim font-mono text-2xl text-fg-dim">
                ∅
            </div>

            <p className="font-display text-[1.7rem] font-extrabold leading-[1.15] tracking-[-0.025em] text-fg">
                No public exports in{' '}
                <code className="rounded-[3px] bg-bg-2 px-[0.3em] font-mono text-[1.4rem] text-brand">./{subpath}</code>
            </p>

            <p className="max-w-[55ch] text-[0.95rem] font-medium leading-[1.6] text-fg-mute">
                Every export in this subpath is marked{' '}
                <code className="rounded-[3px] bg-bg-2 px-[0.3em] font-mono text-[0.85em] text-fg">@internal</code> and
                excluded from the Reference. If you got here from an external link, the symbol you&apos;re looking for
                may have been demoted to internal — try the <strong className="font-bold text-fg">prior version</strong>
                .
            </p>

            <div className="flex flex-wrap gap-2.5">
                <a
                    href={pkgHref}
                    className="inline-flex items-center gap-1.5 rounded-[0.3rem] border-[0.138rem] border-border-strong px-4 py-2.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-fg no-underline transition-all hover:border-brand hover:bg-brand/10 hover:text-brand"
                >
                    Packages › {pkg}
                </a>
            </div>
        </div>
    );
}
