import type { JSX } from 'react';

/**
 * Hero placeholder mirroring `BannerBlock.Skeleton` — a full-width rounded
 * surface holding centered heading, subheading, and CTA placeholders. Reserves
 * the above-the-fold hero footprint so the live banner doesn't shift the
 * viewport when it lands.
 *
 * Uses the tenant-themeable `--surface-2` placeholder surface rather than
 * `BannerBlock.Skeleton`'s legacy `bg-gray-100`; the inner `data-skeleton`
 * shapes carry the motion-safe shimmer defined in `globals.css`.
 *
 * @returns The hero skeleton section.
 */
const HomeHeroSkeleton = (): JSX.Element => (
    <section
        data-block-type="banner"
        data-skeleton-variant="banner"
        className="relative flex flex-col items-center justify-center gap-4 rounded-lg bg-(--surface-2) p-8"
    >
        <div className="flex w-full flex-col items-center gap-3 text-center">
            <div className="h-8 w-2/3 max-w-md rounded-sm md:h-10" data-skeleton />
            <div className="h-4 w-1/2 max-w-sm rounded-sm" data-skeleton />
        </div>
        <div className="h-10 w-32 rounded-full md:h-12 md:w-40" data-skeleton />
    </section>
);
HomeHeroSkeleton.displayName = 'Nordcom.RootLoading.Hero';

/**
 * Product-rail placeholder mirroring `CollectionBlock.skeleton` — a section
 * title placeholder above a card grid sized with the same `--product-card-*`
 * track and `min-h-72` card footprint the live rail uses, so the grid keeps
 * its dimensions when products stream in.
 *
 * @returns The product-rail skeleton section.
 */
const HomeRailSkeleton = (): JSX.Element => (
    <section data-block-type="collection" data-skeleton-variant="rail" className="flex w-full flex-col gap-3">
        <div className="h-6 w-40 max-w-full rounded-sm md:h-7" data-skeleton />
        <div className="justify-(--product-card-grid-align) grid w-full grid-cols-[repeat(auto-fill,minmax(var(--product-card-min-width),var(--product-card-max-width)))] gap-2">
            {Array.from({ length: 7 }).map((_, idx) => (
                <div
                    key={idx}
                    className="relative min-h-72 w-full min-w-(--product-card-min-width) max-w-(--product-card-max-width)"
                    data-skeleton
                />
            ))}
        </div>
    </section>
);
HomeRailSkeleton.displayName = 'Nordcom.RootLoading.Rail';

/**
 * Route-level loading boundary for the tenant home page. Renders a CLS-safe
 * placeholder mirroring the live home composition — a hero banner followed by
 * product rails (`[domain]/[locale]/[...slug]/page.tsx` → `CMSContent` →
 * `BannerBlock` + `CollectionBlock`).
 *
 * Returns a fragment rather than wrapping in `PageContent`: the locale layout
 * already renders `{children}` inside `<PageContent as="article" primary>`, and
 * the live home blocks render as its direct children. Re-wrapping here would
 * nest a second `<article>` and double the primary padding / `min-height`,
 * shifting the page when real content lands. Rendering the skeleton sections
 * directly keeps the same DOM position and `gap-8` / `md:gap-12` spacing as the
 * live blocks.
 *
 * @returns The home loading skeleton.
 */
export default function RootLoading(): JSX.Element {
    return (
        <>
            <HomeHeroSkeleton />
            <HomeRailSkeleton />
            <HomeRailSkeleton />
        </>
    );
}
