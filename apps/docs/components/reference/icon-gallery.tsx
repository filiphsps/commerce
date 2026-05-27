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
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))',
                gap: '0.75rem',
                margin: '1.5rem 0',
            }}
        >
            {children}
        </div>
    );
}

/**
 * Single card in an `IconGallery`. Renders the component name and an optional
 * one-line summary.
 *
 * @param props - Component name and optional summary text.
 * @returns A card element showing name and summary.
 */
export function IconCard({ name, summary }: IconCardProps) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--color-fd-border, #e5e7eb)',
                fontSize: '0.8125rem',
            }}
        >
            <code style={{ fontWeight: 600 }}>{name}</code>
            {summary && (
                <span style={{ color: 'var(--color-fd-muted-foreground, #6b7280)', lineHeight: 1.4 }}>{summary}</span>
            )}
        </div>
    );
}
