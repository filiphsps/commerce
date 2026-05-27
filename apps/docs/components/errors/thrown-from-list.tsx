import type { ReactNode } from 'react';

type ThrownFromCardProps = {
    /** Repo-relative file path, e.g. `apps/storefront/src/middleware.ts`. */
    path: string;
    /** Line number of the throw site. */
    line: number;
    /** Source-line context — the throwing expression. */
    context?: string;
    /** Source-link URL (GitHub blob URL is typical). */
    href?: string;
};

/**
 * Stacked container for `ThrownFromCard` children. Renders each site as a
 * bordered card with path, optional context, and a "View" link.
 *
 * @param props - React children, expected to be `ThrownFromCard` elements.
 * @returns A flex-column container.
 */
export function ThrownFromList({ children }: { children: ReactNode }) {
    return <div className="not-prose flex flex-col gap-1.5">{children}</div>;
}

/**
 * Single throw-site card. Two-column grid with `path:line` + optional context
 * on the left and a "View ↗" link on the right. Hover lifts the border.
 *
 * @param props - Path, line, optional context, and optional href.
 * @returns A grid-layout card element.
 */
export function ThrownFromCard({ path, line, context, href }: ThrownFromCardProps) {
    return (
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-[4px] border-[0.138rem] border-border bg-bg-1 px-3.5 py-2.5 transition-colors duration-150 hover:border-border-strong">
            <div>
                <div className="font-mono text-[0.78rem] text-fg">
                    {path}
                    <span className="text-fg-mute">:{line}</span>
                </div>
                {context ? (
                    <code className="mt-1 block whitespace-pre-wrap break-all rounded-[3px] bg-bg-2 px-2 py-1 font-mono text-[0.72rem] text-fg-mute leading-snug">
                        {context}
                    </code>
                ) : null}
            </div>
            {href ? (
                <a
                    href={href}
                    className="whitespace-nowrap rounded-[3px] border-[0.138rem] border-border px-2.5 py-1.5 font-mono text-[0.66rem] text-fg-mute no-underline transition-colors duration-150 hover:border-brand hover:text-brand"
                >
                    View ↗
                </a>
            ) : null}
        </div>
    );
}
