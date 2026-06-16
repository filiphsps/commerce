/**
 * Pulse-animated placeholder matching the breadcrumb strip's dimensions. Purely decorative — marked
 * `aria-hidden` so assistive tech doesn't announce an empty region while the real breadcrumb nav
 * streams in (the live {@link Breadcrumbs} carries the `nav[aria-label="Breadcrumb"]` landmark).
 *
 * @returns The skeleton breadcrumb element.
 */
export const BreadcrumbsSkeleton = () => {
    return (
        <div
            aria-hidden="true"
            className="flex h-8 w-full max-w-full animate-pulse list-none flex-nowrap items-center justify-start gap-1 overflow-hidden whitespace-nowrap rounded-lg bg-(--surface-1) p-2 px-3 font-semibold"
        />
    );
};
