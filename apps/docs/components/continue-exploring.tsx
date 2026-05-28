import Link from 'next/link';

type ExploreItem = {
    /** Optional eyebrow label rendered above the title, e.g. "Concept · next up". */
    eyebrow?: string;
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

/**
 * Bottom-of-page card grid for cross-page navigation on docs concept pages.
 * Mirrors `.related-section` / `.related-grid` / `.related-card` in
 * visuals/05-page-docs.html — eyebrow + bold title + muted description, two
 * columns on desktop, single column on mobile. Per-tab hover accents picked
 * via the `tab` prop.
 *
 * @param props - Array of explore items.
 * @returns Grid of card anchors, or null when items is empty.
 */
export function ContinueExploring({ items }: { items: ExploreItem[] }) {
    if (items.length === 0) return null;
    return (
        <section className="not-prose mt-16 border-border border-t-[0.138rem] pt-6">
            <div className="mb-4 font-extrabold font-mono text-[0.7rem] text-fg-mute uppercase tracking-[0.14em]">
                Continue exploring
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {items.map((item) => {
                    const tab = item.tab ?? 'docs';
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`block min-w-0 rounded-[0.45rem] border-[0.138rem] border-border bg-bg-1 px-[1.1rem] py-4 no-underline transition-colors duration-150 ${TAB_HOVER[tab]}`}
                        >
                            {item.eyebrow ? (
                                <div className="mb-1.5 font-mono text-[0.6rem] text-fg-mute uppercase tracking-[0.14em]">
                                    {item.eyebrow}
                                </div>
                            ) : null}
                            <div className="font-bold text-[1rem] text-fg tracking-tight leading-tight">
                                {item.title}
                            </div>
                            {item.description ? (
                                <div className="mt-1.5 break-words font-medium text-[0.82rem] text-fg-mute leading-[1.5]">
                                    {item.description}
                                </div>
                            ) : null}
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
