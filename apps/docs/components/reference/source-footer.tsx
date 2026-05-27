type SourceFooterProps = {
    /** Repo-relative source file path. */
    file: string;
    /** Line number of the symbol. */
    line: number;
    /** GitHub blob URL anchored to the symbol's line. */
    href: string;
};

/**
 * Footer for generated reference pages. Shows the source file path on the
 * left, an "Edit on GitHub" action on the right. Above a top divider.
 * Reference: visuals/02-page-reference.html.
 *
 * @param props - File, line, and source-link href.
 * @returns A flex footer element.
 */
export function SourceFooter({ file, line, href }: SourceFooterProps) {
    return (
        <div className="not-prose mt-12 flex flex-wrap items-center justify-between gap-4 border-border border-t-[0.138rem] pt-6 font-mono text-[0.72rem] text-fg-mute">
            <a
                href={href}
                className="inline-flex items-center gap-1.5 rounded-[4px] border-[0.138rem] border-border bg-bg-1 px-2.5 py-1.5 font-mono text-[0.7rem] text-fg no-underline transition-colors duration-150 hover:border-brand hover:text-brand"
            >
                <span className="text-fg-mute">source</span>
                <span>·</span>
                <span>{file}</span>
                <span className="text-fg-mute">:{line}</span>
            </a>
            <a
                href={href}
                className="inline-flex items-center gap-1.5 rounded-[4px] border-[0.138rem] border-border px-3 py-2 font-mono text-[0.7rem] text-fg no-underline transition-colors duration-150 hover:border-brand hover:bg-brand/10 hover:text-brand"
            >
                Edit on GitHub ↗
            </a>
        </div>
    );
}
