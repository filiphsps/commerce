import type { ReactNode } from 'react';

/**
 * Top-of-page banner for symbols annotated with `@deprecated`. Amber palette
 * with a soft glow shadow. Body accepts inline MDX (children).
 *
 * @param props - React children for the deprecation notice body.
 * @returns A role="alert" block with the deprecated styling.
 */
export function DeprecatedBanner({ children }: { children: ReactNode }) {
    return (
        <div
            role="alert"
            className="mb-6 flex max-w-[60rem] items-start gap-4 rounded-[0.45rem] border-[0.2rem] border-err bg-err/10 px-4 py-3 shadow-[0_0_28px_hsl(28_95%_58%_/_0.12)]"
        >
            <span className="flex-shrink-0 whitespace-nowrap rounded-[4px] bg-err px-2 py-1 font-bold font-mono text-[0.62rem] text-bg uppercase tracking-[0.18em]">
                Deprecated
            </span>
            <div className="font-semibold text-[0.92rem] text-fg leading-snug [&_code]:rounded-[3px] [&_code]:bg-bg-2 [&_code]:px-1.5 [&_code]:font-medium [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-fg [&_strong]:font-bold [&_strong]:text-err">
                {children}
            </div>
        </div>
    );
}
