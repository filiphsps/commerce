import Link from 'next/link';
import type { ReactNode } from 'react';

type ThrowsRowProps = {
    /** Error class name, e.g. `NotFoundError`. */
    cls: string;
    /** Optional `/reference/errors/<kebab>/` link target. */
    href?: string;
    /** Inline description of when the throw occurs. */
    children: ReactNode;
};

/**
 * Stacked container for `ThrowsRow` children. Renders a vertical list of
 * `@throws` declarations under the "Throws" section heading on reference
 * pages. Reference: visuals/02-page-reference.html.
 *
 * @param props - React children, expected to be `ThrowsRow` elements.
 * @returns A flex-column container.
 */
export function ThrowsBlock({ children }: { children: ReactNode }) {
    return <div className="not-prose mb-4 flex flex-col gap-2">{children}</div>;
}

/**
 * Single `@throws` row: amber left-rail card with the error class on the left
 * and the "when" context inline on the right.
 *
 * @param props - Class name, optional href, and the "when" body as children.
 * @returns A grid-row card.
 */
export function ThrowsRow({ cls, href, children }: ThrowsRowProps) {
    return (
        <div className="flex items-baseline gap-3 rounded-r-[4px] border-err border-l-[0.29rem] bg-err/5 px-3.5 py-2.5">
            {href ? (
                <Link
                    href={href}
                    className="flex-shrink-0 font-mono font-semibold text-[0.84rem] text-err no-underline hover:underline"
                >
                    {cls}
                </Link>
            ) : (
                <span className="flex-shrink-0 font-mono font-semibold text-[0.84rem] text-err">{cls}</span>
            )}
            <div className="font-medium text-[0.85rem] text-fg-mute leading-snug [&_code]:rounded-[3px] [&_code]:bg-bg-2 [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-fg">
                {children}
            </div>
        </div>
    );
}
