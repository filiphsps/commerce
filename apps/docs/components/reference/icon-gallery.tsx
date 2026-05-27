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
 * Lays out `IconCard` children in a responsive multi-column grid via the
 * `.icon-gallery` CSS class in globals.css.
 *
 * @param props - React children (expected to be `IconCard` elements).
 * @returns A grid container element.
 */
export function IconGallery({ children }: IconGalleryProps) {
    return <div className="icon-gallery">{children}</div>;
}

/**
 * Single card in an `IconGallery`. Renders the component name and an optional
 * one-line summary. Styled via `.icon-card` in globals.css.
 *
 * @param props - Component name and optional summary text.
 * @returns A card element showing name and summary.
 */
export function IconCard({ name, summary }: IconCardProps) {
    return (
        <article className="icon-card">
            <code style={{ fontWeight: 600 }}>{name}</code>
            {summary && (
                <span style={{ color: 'var(--color-fg-mute)', lineHeight: 1.4 }}>{summary}</span>
            )}
        </article>
    );
}
