import type { ReactNode } from 'react';

/**
 * Top-of-page banner for symbols annotated with `@beta`. Renders with the
 * cyan/ref palette + soft glow. Body accepts inline MDX (children).
 *
 * @param props - React children for the beta notice body.
 * @returns A role="alert" block with the beta styling.
 */
export function BetaBanner({ children }: { children: ReactNode }) {
    return (
        <div className="jsdoc-banner beta" role="alert">
            <span className="label">Beta</span>
            <div className="body">{children}</div>
        </div>
    );
}
