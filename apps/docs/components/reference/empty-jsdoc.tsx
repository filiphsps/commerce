type EmptyJSDocProps = {
    /** GitHub blob URL pointing to the symbol's source location. */
    href: string;
};

/**
 * Branded empty-state card shown on reference pages where the symbol has no
 * JSDoc comment yet. Renders a brand-magenta hollow circle icon, encouraging
 * title, brief body text, and two CTA links (Edit on GitHub / View source).
 * The signature block is still rendered below this card in the MDX. Matches
 * the `.empty-card` pattern in visuals/09-empty-states.html.
 *
 * @param props - GitHub blob URL for the symbol's source file.
 * @returns The JSDoc-missing empty state card.
 */
export function EmptyJSDoc({ href }: EmptyJSDocProps) {
    return (
        <div className="not-prose my-8 grid max-w-[920px] place-items-start gap-5 rounded-[0.45rem] border-[0.2rem] border-border bg-[radial-gradient(ellipse_at_center_top,var(--color-bg-1)_30%,var(--color-bg))] p-10">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-fg-mute">Reference · no JSDoc</p>

            <div
                className="flex h-14 w-14 items-center justify-center rounded-full border-[0.2rem] border-brand font-mono text-2xl text-brand"
                style={{ boxShadow: '0 0 24px hsl(330 86% 53% / 0.35)' }}
            >
                {'{ }'}
            </div>

            <p className="font-display text-[1.7rem] font-extrabold leading-[1.15] tracking-[-0.025em] text-fg">
                No <span className="text-brand">JSDoc</span> for this symbol yet
            </p>

            <p className="max-w-[55ch] text-[0.95rem] font-medium leading-[1.6] text-fg-mute">
                The TypeScript signature is available but the symbol has no{' '}
                <code className="rounded-[3px] bg-bg-2 px-[0.3em] font-mono text-[0.85em] text-fg">@param</code>,{' '}
                <code className="rounded-[3px] bg-bg-2 px-[0.3em] font-mono text-[0.85em] text-fg">@returns</code>, or
                summary comment. Per <strong className="font-bold text-fg">CLAUDE.md</strong> all exported and internal
                functions must have JSDoc — this one is overdue.
            </p>

            <div className="flex flex-wrap gap-2.5">
                <a
                    href={href}
                    className="inline-flex items-center gap-1.5 rounded-[0.3rem] border-[0.138rem] border-brand bg-brand px-4 py-2.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-black no-underline transition-all hover:border-brand hover:bg-brand/90"
                >
                    Edit on GitHub →
                </a>
                <a
                    href={href}
                    className="inline-flex items-center gap-1.5 rounded-[0.3rem] border-[0.138rem] border-border-strong px-4 py-2.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-fg no-underline transition-all hover:border-brand hover:bg-brand/10 hover:text-brand"
                >
                    View source
                </a>
            </div>
        </div>
    );
}
