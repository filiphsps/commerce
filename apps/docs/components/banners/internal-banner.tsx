import type { ReactNode } from 'react';

/**
 * Top-of-page banner for symbols annotated with `@internal`. Gray, low-contrast
 * styling. The page is normally hidden from the Reference tab; this banner
 * appears only when browsing source via `?include=internal` builds.
 *
 * @param props - React children for the internal notice body.
 * @returns A role="status" block with the internal styling.
 */
export function InternalBanner({ children }: { children?: ReactNode }) {
    return (
        <div
            role="status"
            className="mb-6 flex max-w-[60rem] items-start gap-4 rounded-[0.45rem] border-[0.2rem] border-fg-dim bg-bg-1 px-4 py-3 opacity-80"
        >
            <span className="flex-shrink-0 whitespace-nowrap rounded-[4px] bg-fg-dim px-2 py-1 font-bold font-mono text-[0.62rem] text-fg uppercase tracking-[0.18em]">
                Internal
            </span>
            <div className="font-semibold text-[0.92rem] text-fg-mute leading-snug [&_code]:rounded-[3px] [&_code]:bg-bg-2 [&_code]:px-1.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_strong]:font-bold [&_strong]:text-fg">
                {children ?? (
                    <>
                        This symbol is marked <code>@internal</code> and excluded from the Reference tab.{' '}
                        <strong>Don't import outside the package.</strong>
                    </>
                )}
            </div>
        </div>
    );
}
