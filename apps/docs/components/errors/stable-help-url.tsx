type StableHelpUrlProps = {
    /** Canonical, version-stable help URL pasted into the user's error message. */
    href: string;
    /** GitHub edit URL for the underlying MDX file. */
    editUrl?: string;
};

/**
 * Footer for error pages: prints the stable help URL the SDK embeds in
 * thrown errors and a secondary "Edit on GitHub" action.
 *
 * @param props - Stable help URL and optional edit URL.
 * @returns A flex footer element with a top border.
 */
export function StableHelpUrl({ href, editUrl }: StableHelpUrlProps) {
    return (
        <div className="not-prose mt-12 flex flex-wrap items-center justify-between gap-4 border-border border-t-[0.138rem] pt-6 font-mono text-[0.72rem] text-fg-mute">
            <div className="flex flex-wrap items-center gap-2.5">
                <span>Stable help URL:</span>
                <a
                    href={href}
                    className="rounded-[4px] border-[0.138rem] border-border bg-bg-2 px-2.5 py-1.5 font-mono text-[0.72rem] text-fg no-underline transition-colors duration-150 hover:border-brand hover:text-brand"
                >
                    {href}
                </a>
            </div>
            {editUrl ? (
                <a
                    href={editUrl}
                    className="inline-flex items-center gap-1.5 rounded-[4px] border-[0.138rem] border-border px-3 py-2 font-mono text-[0.7rem] text-fg no-underline transition-colors duration-150 hover:border-brand hover:bg-brand/10 hover:text-brand"
                >
                    Edit on GitHub ↗
                </a>
            ) : null}
        </div>
    );
}
