import type { ReactNode } from 'react';

/**
 * Top-of-page banner for symbols annotated with `@experimental`. Cyan dashed
 * border (no glow) — stronger warning than beta; usually requires opt-in flags.
 *
 * @param props - React children for the experimental notice body.
 * @returns A role="status" block with the experimental styling.
 */
export function ExperimentalBanner({ children }: { children?: ReactNode }) {
    return (
        <div
            role="status"
            className="mb-6 flex max-w-[60rem] items-start gap-4 rounded-[0.45rem] border-[0.2rem] border-ref border-dashed bg-ref/5 px-4 py-3"
        >
            <span className="flex-shrink-0 whitespace-nowrap rounded-[4px] bg-ref px-2 py-1 font-bold font-mono text-[0.62rem] text-bg uppercase tracking-[0.18em]">
                Experimental
            </span>
            <div className="font-semibold text-[0.92rem] text-fg leading-snug [&_code]:rounded-[3px] [&_code]:bg-bg-2 [&_code]:px-1.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_strong]:font-bold [&_strong]:text-ref">
                {children ?? (
                    <>
                        Behind a feature flag and not enabled by default.{' '}
                        <strong>API and behavior subject to change</strong>; do not depend on this in production.
                    </>
                )}
            </div>
        </div>
    );
}
