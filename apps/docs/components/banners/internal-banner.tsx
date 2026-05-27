import type { ReactNode } from 'react';

/**
 * Top-of-page banner for symbols annotated with `@internal`. Muted styling
 * signals that the API is not part of the public surface. Body accepts inline
 * MDX (children).
 *
 * @param props - React children for the internal notice body.
 * @returns A role="note" block with the internal styling.
 */
export function InternalBanner({ children }: { children: ReactNode }) {
    return (
        <div className="jsdoc-banner internal" role="note">
            <span className="label">Internal</span>
            <div className="body">{children}</div>
        </div>
    );
}
