import Link from 'next/link';

type ReferenceBackLinkProps = {
    /** Workspace slug used to build the Packages-tab URL (e.g. "cms"). */
    slug: string;
    /**
     * Subpath export key. The literal string `"index"` maps to the workspace
     * root; all other values are rendered as-is in the body label.
     */
    subpath: string;
};

/**
 * Callout-style banner at the top of every reference subpath overview, linking
 * back to the workspace's Packages-tab narrative page. Gives readers a quick
 * path from the generated API docs to the authored guide.
 *
 * @param props - Workspace slug and subpath key.
 * @returns A styled anchor block linking to the Packages narrative.
 */
export function ReferenceBackLink({ slug, subpath }: ReferenceBackLinkProps) {
    return (
        <Link
            href={`/packages/${slug}/`}
            className="mb-6 flex items-center justify-between gap-3 rounded-[0.45rem] border-[0.138rem] border-border bg-bg-1 px-4 py-3 text-fg no-underline transition-colors duration-150 hover:border-ref [&_.arrow]:hover:translate-x-1"
        >
            <div>
                <div className="mb-0.5 font-bold text-[0.62rem] text-ref uppercase tracking-[0.18em]">
                    Packages narrative
                </div>
                <div className="font-mono text-fg text-sm">
                    packages / {slug}
                    {subpath === 'index' ? '' : ` / ${subpath}`}
                </div>
            </div>
            <span className="arrow inline-block text-lg text-ref transition-transform duration-150">→</span>
        </Link>
    );
}
