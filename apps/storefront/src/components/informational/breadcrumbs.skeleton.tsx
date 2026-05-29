/**
 * Pulse-animated placeholder matching the breadcrumb strip's dimensions.
 *
 * @returns The skeleton breadcrumb element.
 */
export const BreadcrumbsSkeleton = () => {
    return (
        <section className="flex h-8 w-full max-w-full animate-pulse list-none flex-nowrap items-center justify-start gap-1 overflow-hidden whitespace-nowrap rounded-lg bg-(--surface-1) p-2 px-3 font-semibold" />
    );
};
