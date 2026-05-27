import Link from 'next/link';

type Tab = 'docs' | 'packages' | 'reference' | 'errors';

const SUGGESTIONS: { title: string; description: string; href: string; tab: Tab }[] = [
    {
        title: 'Introduction',
        description: 'Multi-tenant Next.js storefront platform fronting Shopify.',
        href: '/introduction/',
        tab: 'docs',
    },
    {
        title: 'Reference',
        description: 'Generated API catalogue across every package.',
        href: '/reference/',
        tab: 'reference',
    },
    {
        title: 'Errors',
        description: 'Stable error-code catalogue with throw-sites.',
        href: '/errors/',
        tab: 'errors',
    },
];

const TAB_CHIP: Record<Tab, string> = {
    docs: 'border-brand text-brand',
    packages: 'border-pkg text-pkg',
    reference: 'border-ref text-ref',
    errors: 'border-err text-err',
};

/**
 * Custom 404 page modeled on visuals/09-empty-states.html `.empty-card.center`.
 * Eyebrow, amber `!` icon, h1, suggestion list with tab-chip mini badges, and
 * primary/secondary CTAs (Back to introduction + Search the docs ⌘K).
 *
 * @returns The 404 article.
 */
export default function NotFound() {
    return (
        <article className="flex flex-col gap-4 px-4 py-6 [grid-area:main] md:px-6 md:pt-8 xl:px-8 xl:pt-14">
            <div className="mx-auto grid w-full max-w-[920px] place-items-center gap-5 rounded-[0.45rem] border-[0.2rem] border-border bg-[radial-gradient(ellipse_at_center_top,var(--color-bg-1)_30%,var(--color-bg))] px-6 py-12 text-center sm:px-10 sm:py-14">
                <span className="font-mono text-[0.62rem] text-fg-mute uppercase tracking-[0.18em]">
                    404 · this page doesn't exist
                </span>

                <span className="flex h-14 w-14 items-center justify-center rounded-full border-[0.2rem] border-err font-mono text-[1.5rem] text-err">
                    !
                </span>

                <h1 className="max-w-[34ch] font-extrabold text-[1.7rem] text-fg leading-[1.15] tracking-[-0.025em]">
                    No page at this URL
                </h1>

                <p className="max-w-[55ch] font-medium text-[0.95rem] text-fg-mute leading-[1.6]">
                    The link you followed may be broken, or the page may have moved. Here are a few starting points:
                </p>

                <ul className="my-1 flex w-full max-w-[480px] list-none flex-col gap-2 p-0">
                    {SUGGESTIONS.map((s) => (
                        <li key={s.href} className="m-0 p-0">
                            <Link
                                href={s.href}
                                className="group flex items-center justify-between gap-3 rounded-[4px] border-[0.138rem] border-border bg-bg-1 px-4 py-2.5 text-left no-underline transition-colors duration-150 hover:border-brand hover:bg-[hsl(330_86%_53%_/_0.06)]"
                            >
                                <span className="flex flex-col gap-0.5">
                                    <span className="font-bold text-[0.85rem] text-fg group-hover:text-brand">
                                        {s.title}
                                    </span>
                                    <span className="font-medium text-[0.78rem] text-fg-mute leading-[1.4]">
                                        {s.description}
                                    </span>
                                </span>
                                <span
                                    className={`rounded-[3px] border-[1px] px-1.5 py-0.5 font-bold font-mono text-[0.55rem] uppercase tracking-[0.14em] ${TAB_CHIP[s.tab]}`}
                                >
                                    {s.tab}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="mt-3 flex flex-wrap justify-center gap-2.5">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 rounded-[4px] border-[0.138rem] border-brand bg-brand px-4 py-2.5 font-bold text-[0.7rem] text-white uppercase tracking-[0.14em] no-underline transition-colors duration-150 hover:bg-[hsl(330_86%_60%)]"
                    >
                        Back to introduction →
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 rounded-[4px] border-[0.138rem] border-border-strong bg-transparent px-4 py-2.5 font-bold text-[0.7rem] text-fg uppercase tracking-[0.14em] no-underline transition-colors duration-150 hover:border-brand hover:bg-[hsl(330_86%_53%_/_0.08)] hover:text-brand"
                    >
                        Search the docs{' '}
                        <span className="ms-1.5 inline-flex items-center gap-1">
                            <kbd className="rounded-[3px] border border-border-strong bg-bg-2 px-1.5 py-0.5 font-mono text-[0.55rem] text-fg">
                                ⌘
                            </kbd>
                            <kbd className="rounded-[3px] border border-border-strong bg-bg-2 px-1.5 py-0.5 font-mono text-[0.55rem] text-fg">
                                K
                            </kbd>
                        </span>
                    </Link>
                </div>
            </div>
        </article>
    );
}
