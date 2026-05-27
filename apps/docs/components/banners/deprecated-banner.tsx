import type { ReactNode } from 'react';

/**
 * Top-of-page banner for symbols annotated with `@deprecated`. Renders with the
 * amber palette + soft glow. Body accepts inline MDX (children).
 *
 * @param props - React children for the deprecation notice body.
 * @returns A role="alert" block with the deprecated styling.
 */
export function DeprecatedBanner({ children }: { children: ReactNode }) {
    return (
        <div className="jsdoc-banner deprecated" role="alert">
            <span className="label">Deprecated</span>
            <div className="body">{children}</div>
        </div>
    );
}
