import type { ReactNode } from 'react';

type KindLineProps = {
    /** Symbol kind label (e.g. "function", "class", "component"). */
    kind: string;
    /** Slash-separated workspace + subpath (e.g. "cms/api"). */
    path: string;
    /** When present, renders a "throws" badge alongside the kind pill. */
    throws?: boolean;
    children?: ReactNode;
};

/**
 * Metadata strip rendered at the top of every generated reference page,
 * showing the symbol's kind, the subpath it belongs to, and an optional
 * "throws" badge when `@throws` tags are present in the JSDoc.
 *
 * @param props - Kind label, package path, and optional throws flag.
 * @returns A metadata strip as a paragraph-level block.
 */
export function KindLine({ kind, path, throws }: KindLineProps) {
    return (
        <p
            style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                fontSize: '0.8125rem',
                color: 'var(--color-fd-muted-foreground, #6b7280)',
                margin: '0 0 1.5rem',
            }}
        >
            <code
                style={{
                    background: 'var(--color-fd-muted, #f3f4f6)',
                    borderRadius: '0.25rem',
                    padding: '0.125rem 0.5rem',
                    fontWeight: 600,
                }}
            >
                {kind}
            </code>
            <span>{path}</span>
            {throws && (
                <code
                    style={{
                        background: 'var(--color-fd-muted, #f3f4f6)',
                        borderRadius: '0.25rem',
                        padding: '0.125rem 0.5rem',
                        color: 'var(--color-fd-destructive, #ef4444)',
                    }}
                >
                    throws
                </code>
            )}
        </p>
    );
}
