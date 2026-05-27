import Link from 'next/link';

/**
 * Custom 404 page styled per visuals/09-empty-states.html. Centered card
 * with the Nordstar amber error treatment, a quick description, and two
 * CTAs (back to introduction, open search). Wrapped in an article with
 * `grid-area:main` so it lands in the DocsLayout main slot.
 *
 * @returns The 404 page body.
 */
export default function NotFound() {
    return (
        <article className="flex flex-col gap-4 px-4 py-6 [grid-area:main] md:px-6 md:pt-8 xl:px-8 xl:pt-14 *:max-w-[900px]">
            <div className="mx-auto mt-8 grid w-full max-w-[920px] place-items-center gap-5 rounded-[0.45rem] border-[0.2rem] border-border bg-[radial-gradient(ellipse_at_center_top,var(--color-bg-1)_30%,var(--color-bg))] px-10 py-12 text-center">
                <span className="font-mono text-[0.62rem] text-fg-mute uppercase tracking-[0.18em]">
                    404 · this page doesn't exist
                </span>
                <span className="flex h-14 w-14 items-center justify-center rounded-full border-[0.2rem] border-err font-mono text-[1.5rem] text-err">
                    !
                </span>
                <h1 className="max-w-[34ch] font-extrabold text-[1.7rem] text-fg leading-tight tracking-[-0.025em]">
                    No page at this URL
                </h1>
                <p className="max-w-[55ch] font-medium text-[0.95rem] text-fg-mute leading-relaxed">
                    The link you followed may be broken, or the page may have moved. Try the four tabs above, or jump
                    back to the start.
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2.5">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 rounded-[4px] border-[0.138rem] border-brand bg-brand px-4 py-2.5 font-bold text-[0.7rem] text-bg uppercase tracking-[0.14em] no-underline transition-colors duration-150 hover:bg-[hsl(330_86%_60%)]"
                    >
                        Back to introduction →
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 rounded-[4px] border-[0.138rem] border-border-strong bg-transparent px-4 py-2.5 font-bold text-[0.7rem] text-fg uppercase tracking-[0.14em] no-underline transition-colors duration-150 hover:border-brand hover:bg-brand/10 hover:text-brand"
                    >
                        Search the docs ⌘K
                    </Link>
                </div>
            </div>
        </article>
    );
}
