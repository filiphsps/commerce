import Link from 'next/link';
import symbolIndex from '../../lib/symbol-index.generated.json';

type ReferenceBackLinkProps = {
    /** Workspace slug used to build the Packages-tab URL (e.g. "cms"). */
    slug: string;
    /**
     * Subpath export key. The literal string `"index"` maps to the workspace
     * root; all other values are rendered as-is in the body label.
     */
    subpath: string;
};

type PageEntry = { url: string; tab: string };

/**
 * Resolve the Packages-tab landing URL for a workspace by scanning the
 * symbol index. Authored packages live under one of two patterns:
 *   `/packages/<slug>/...` (top-level workspace, e.g. utils)
 *   `/packages/<category>/<slug>/...` (categorised workspace, e.g. core/cms)
 * Returns the URL of an existing page (preferring `overview`, then any
 * non-changelog page, then any page) so the link doesn't 404 — there is no
 * `index.mdx` at the workspace root, only authored page files. Falls back
 * to the Packages root when nothing matches.
 *
 * @param slug - Workspace slug from the TypeDoc output.
 * @returns Concrete URL of an existing authored package page.
 */
function resolvePackageUrl(slug: string): string {
    const rawIndex = symbolIndex as unknown as Record<string, PageEntry[]>;
    const matches: string[] = [];
    for (const entries of Object.values(rawIndex)) {
        for (const entry of entries) {
            if (entry.tab !== 'packages') continue;
            const segs = entry.url.split('/').filter(Boolean);
            if (segs[1] === slug || (segs.length >= 3 && segs[2] === slug)) {
                matches.push(entry.url);
            }
        }
    }
    if (matches.length === 0) return '/packages/';
    const depth = (u: string) => u.split('/').filter(Boolean).length;
    const overviews = matches.filter((u) => u.endsWith('/overview/')).sort((a, b) => depth(a) - depth(b));
    if (overviews[0]) return overviews[0];
    const nonChangelog = matches.filter((u) => !u.endsWith('/changelog/')).sort((a, b) => depth(a) - depth(b));
    return nonChangelog[0] ?? matches[0] ?? '/packages/';
}

/**
 * Callout-style banner at the top of every reference subpath overview, linking
 * back to the workspace's Packages-tab narrative page. Gives readers a quick
 * path from the generated API docs to the authored guide.
 *
 * @param props - Workspace slug and subpath key.
 * @returns A styled anchor block linking to the Packages narrative.
 */
export function ReferenceBackLink({ slug, subpath }: ReferenceBackLinkProps) {
    const href = resolvePackageUrl(slug);
    return (
        <Link
            href={href}
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
