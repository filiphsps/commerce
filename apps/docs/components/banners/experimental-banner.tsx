import type { ReactNode } from 'react';

/**
 * Top-of-page banner for symbols annotated with `@experimental`. Renders with
 * a dashed cyan border to signal instability. Body accepts inline MDX (children).
 *
 * @param props - React children for the experimental notice body.
 * @returns A role="alert" block with the experimental styling.
 */
export function ExperimentalBanner({ children }: { children: ReactNode }) {
    return (
        <div className="jsdoc-banner experimental" role="alert">
            <span className="label">Experimental</span>
            <div className="body">{children}</div>
        </div>
    );
}
