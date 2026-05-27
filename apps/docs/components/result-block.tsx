import type { ReactNode } from 'react';

type ResultBlockProps = {
    /** The output expression rendered next to the "Returns" label. */
    children: ReactNode;
    /** Optional label override (defaults to "Returns"). */
    label?: string;
};

/**
 * Result block — hangs off the bottom of a codeblock with a dashed border to
 * show the call's evaluated output. Reference: visuals/07-codeblock.html
 * `.result-block`.
 *
 * @param props - Output children and optional label.
 * @returns The result block wrapper.
 */
export function ResultBlock({ children, label = 'Returns' }: ResultBlockProps) {
    return (
        <div className="not-prose -mt-4 mb-4 max-w-[920px] rounded-b-[0.45rem] border-[0.138rem] border-border-strong border-t-0 border-dashed bg-bg px-4 py-3 font-mono text-[0.78rem] text-fg-mute leading-relaxed">
            <span className="mb-1 block font-bold font-sans text-[0.55rem] text-fg-dim uppercase tracking-[0.18em]">
                {label}
            </span>
            <span className="text-fg">{children}</span>
        </div>
    );
}
