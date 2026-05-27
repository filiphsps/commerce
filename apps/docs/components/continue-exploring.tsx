type ExploreItem = {
    /** Display title, e.g. "Multi-tenancy". */
    title: string;
    /** One-line description sitting below the title. */
    description?: string;
    /** Page URL. */
    href: string;
    /** Tab the destination lives in — picks the per-tab neon for hover. */
    tab?: 'docs' | 'packages' | 'reference' | 'errors';
};

const TAB_HOVER: Record<NonNullable<ExploreItem['tab']>, string> = {
    docs: 'hover:border-brand hover:bg-brand/5',
    packages: 'hover:border-pkg hover:bg-pkg/5',
    reference: 'hover:border-ref hover:bg-ref/5',
    errors: 'hover:border-err hover:bg-err/5',
};

const TAB_ACCENT: Record<NonNullable<ExploreItem['tab']>, string> = {
    docs: 'text-brand',
    packages: 'text-pkg',
    reference: 'text-ref',
    errors: 'text-err',
};

/**
 * Bottom-of-page card grid for cross-page navigation on docs concept pages.
 * Mirrors the "Continue exploring" block in visuals/05-page-docs.html.
 *
 * @param props - Array of explore items.
 * @returns A grid of card-style anchor elements, or null when items is empty.
 */
export function ContinueExploring({ items }: { items: ExploreItem[] }) {
    if (items.length === 0) return null;
    return (
        <div className="not-prose mt-10 border-border border-t-[0.138rem] pt-6">
            <div className="mb-4 font-extrabold text-[0.76rem] text-fg-mute uppercase tracking-[0.22em]">
                Continue exploring
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                {items.map((item) => {
                    const tab = item.tab ?? 'docs';
                    return (
                        <a
                            key={item.href}
                            href={item.href}
                            className={`block rounded-[0.45rem] border-[0.138rem] border-border bg-bg-1 px-4 py-3.5 no-underline transition-colors duration-150 ${TAB_HOVER[tab]}`}
                        >
                            <div className={`font-extrabold text-[0.95rem] tracking-tight ${TAB_ACCENT[tab]}`}>
                                {item.title}
                            </div>
                            {item.description ? (
                                <div className="mt-1 font-medium text-[0.78rem] text-fg-mute leading-snug">
                                    {item.description}
                                </div>
                            ) : null}
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
