import type { ReactNode } from 'react';

type IconGalleryProps = {
    children?: ReactNode;
};

type IconCardProps = {
    /** Component name (used as the display label and accessible name). */
    name: string;
    /** One-line JSDoc summary from TypeDoc. */
    summary?: string;
};

/**
 * Grid wrapper for icon-catalogue pages (e.g. `react-payment-brand-icons`).
 * Lays out `IconCard` children in a responsive multi-column grid.
 *
 * @param props - React children (expected to be `IconCard` elements).
 * @returns A grid container element.
 */
export function IconGallery({ children }: IconGalleryProps) {
    return <div className="my-6 grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">{children}</div>;
}

/**
 * Single card in an `IconGallery`. Renders the component name and an optional
 * one-line summary. Hover lifts the border to brand color.
 *
 * @param props - Component name and optional summary text.
 * @returns A card element showing name and summary.
 */
export function IconCard({ name, summary }: IconCardProps) {
    return (
        <article className="flex flex-col gap-1 rounded-[0.45rem] border-[0.138rem] border-border bg-bg-1 p-3 text-[0.8125rem] transition-colors duration-150 hover:border-brand">
            <code className="font-mono font-semibold text-fg">{name}</code>
            {summary ? <span className="text-fg-mute leading-snug">{summary}</span> : null}
        </article>
    );
}
