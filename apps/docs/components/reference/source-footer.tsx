type SourceFooterProps = {
    /** Repo-relative source file path. */
    file: string;
    /** Line number of the symbol. */
    line: number;
    /** GitHub blob URL anchored to the symbol's line. */
    href: string;
    /** Workspace package name (`@nordcom/commerce-cms`) for the version chip. */
    pkg?: string;
    /** Workspace package version (e.g. `0.1.0`). */
    version?: string;
};

/**
 * Footer for generated reference pages. Stacks vertically on mobile, two
 * columns on sm+. Source path truncates progressively: filename only on
 * mobile, last two segments on sm, full path on lg+. Reference: visuals/02.
 *
 * @param props - File, line, GitHub href, and optional pkg/version.
 * @returns A responsive footer with source and metadata sections.
 */
export function SourceFooter({ file, line, href, pkg, version }: SourceFooterProps) {
    const segs = file.split('/');
    const filename = segs.at(-1) ?? file;
    const short = segs.length >= 3 ? segs.slice(-2).join('/') : file;

    return (
        <div className="not-prose mt-12 flex flex-col gap-4 border-border border-t-[0.138rem] pt-6 sm:grid sm:grid-cols-2 sm:gap-6">
            <div className="flex min-w-0 flex-col gap-1.5">
                <span className="font-mono text-[0.6rem] text-fg-dim uppercase tracking-[0.16em]">Source</span>
                <a
                    href={href}
                    title={file}
                    className="inline-flex max-w-full min-w-0 overflow-hidden w-fit items-center gap-1.5 rounded-[4px] border-[0.138rem] border-border bg-bg-1 px-2.5 py-1.5 font-mono text-[0.78rem] text-fg no-underline transition-colors duration-150 hover:border-brand hover:bg-brand/5 hover:text-brand"
                >
                    <span className="sm:hidden">{filename}</span>
                    <span className="hidden sm:inline lg:hidden">{short}</span>
                    <span className="hidden lg:inline">{file}</span>
                    <span className="text-fg-mute">:{line}</span>
                    <span className="ms-1">↗</span>
                </a>
                <span className="font-mono text-[0.7rem] text-fg-mute">Edit the JSDoc directly</span>
            </div>
            <div className="flex min-w-0 flex-col items-start gap-1.5 sm:items-end">
                <span className="font-mono text-[0.6rem] text-fg-dim uppercase tracking-[0.16em]">Metadata</span>
                {pkg && version ? (
                    <span className="rounded-[3px] border border-pkg/40 bg-pkg/10 px-1.5 py-0.5 font-mono text-[0.66rem] text-pkg">
                        {pkg}@{version}
                    </span>
                ) : null}
                <a
                    href={href}
                    className="inline-flex w-fit items-center gap-1.5 rounded-[4px] border-[0.138rem] border-border px-2.5 py-1.5 font-mono text-[0.7rem] text-fg no-underline transition-colors duration-150 hover:border-brand hover:bg-brand/10 hover:text-brand"
                >
                    Open in GitHub ↗
                </a>
            </div>
        </div>
    );
}
