import Link from 'next/link';
import { docsEnv } from '@/lib/env';

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
 * back to the workspace's Packages-tab narrative page. This gives readers a
 * quick path from the generated API docs to the authored guide. Styled via
 * `.ref-banner` in globals.css.
 *
 * @param props - Workspace slug and subpath key.
 * @returns A styled anchor block linking to the Packages narrative.
 */
export function ReferenceBackLink({ slug, subpath }: ReferenceBackLinkProps) {
    return (
        <Link href={`${docsEnv.basePath}/docs/packages/${slug}/`} className="ref-banner" role="link">
            <div>
                <div className="label">Packages narrative</div>
                <div className="body">
                    packages / {slug}
                    {subpath === 'index' ? '' : ` / ${subpath}`}
                </div>
            </div>
            <div className="arrow">→</div>
        </Link>
    );
}
