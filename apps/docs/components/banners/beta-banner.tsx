import type { ReactNode } from 'react';

/**
 * Top-of-page banner for symbols annotated with `@beta`. Cyan palette with a
 * subtle glow. Used when an API is shipped publicly but its shape may still
 * change without a major version bump.
 *
 * @param props - React children for the beta notice body.
 * @returns A role="status" block with the beta styling.
 */
export function BetaBanner({ children }: { children?: ReactNode }) {
    return (
        <div
            role="status"
            className="mb-6 flex max-w-[60rem] items-start gap-4 rounded-[0.45rem] border-[0.2rem] border-ref bg-ref/8 px-4 py-3 shadow-[0_0_24px_hsl(190_95%_55%_/_0.10)]"
        >
            <span className="flex-shrink-0 whitespace-nowrap rounded-[4px] bg-ref px-2 py-1 font-bold font-mono text-[0.62rem] text-bg uppercase tracking-[0.18em]">
                Beta
            </span>
            <div className="font-semibold text-[0.92rem] text-fg leading-snug [&_code]:rounded-[3px] [&_code]:bg-bg-2 [&_code]:px-1.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_strong]:font-bold [&_strong]:text-ref">
                {children ?? (
                    <>
                        Public API but the shape may still change without a major version bump.{' '}
                        <strong>Pin a patch version</strong> if you depend on this in production.
                    </>
                )}
            </div>
        </div>
    );
}
