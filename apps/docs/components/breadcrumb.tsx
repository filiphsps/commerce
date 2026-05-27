'use client';

import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { Fragment } from 'react';

/** Tab-name segments that already serve as their own breadcrumb root. */
const TAB_ROOTS = new Set(['reference', 'packages', 'errors']);

/**
 * Resolve the Tailwind text-color class for the leaf segment, keyed by the
 * active tab. Matches the per-tab neon accent used in the sidebar chip and
 * visuals/02–04 mockups (`errors` → amber, `reference` → cyan, `packages` →
 * lime, `docs` → brand magenta).
 *
 * @param tab - First URL segment or "docs" for the docs virtual root.
 * @returns Tailwind text-color class string.
 */
function leafColorClass(tab: string): string {
    switch (tab) {
        case 'errors':
            return 'text-err';
        case 'reference':
            return 'text-ref';
        case 'packages':
            return 'text-pkg';
        default:
            return 'text-brand';
    }
}

/**
 * Convert a URL slug segment to a breadcrumb label. Preserves hyphens and
 * keeps lowercase to match the monospace breadcrumb style in the mockup
 * (visuals/02-page-reference.html): `reference / cms / api / get-article`.
 *
 * @param slug - The raw URL segment.
 * @returns The label string (identical to slug, always lowercase).
 */
function slugToLabel(slug: string): string {
    return slug.toLowerCase();
}

/**
 * URL-driven breadcrumb that paints each path segment as a slash-separated
 * link, leaf in the active tab's semantic neon accent. Replaces Fumadocs's
 * default tree-driven breadcrumb to match visuals/02/04/05 (mono caption, `/`
 * separators, fg-mute links, neon leaf). For docs-tab pages whose URLs have
 * no leading tab segment (e.g. `/concepts/multi-tenancy/`), a virtual
 * non-linked "docs" prefix is prepended: `docs / concepts / multi-tenancy`.
 *
 * @returns The breadcrumb nav, or null at the root.
 */
export function Breadcrumb() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    // Docs-tab pages have no tab segment in the URL — prepend "docs" label.
    const firstSeg = segments[0] ?? '';
    const isDocTab = !TAB_ROOTS.has(firstSeg);
    const tab = isDocTab ? 'docs' : firstSeg;
    const leafColor = leafColorClass(tab);

    const displaySegments = isDocTab
        ? [
              { label: 'docs', href: null },
              ...segments.map((s, i) => ({ label: slugToLabel(s), href: `/${segments.slice(0, i + 1).join('/')}/` })),
          ]
        : segments.map((s, i) => ({ label: slugToLabel(s), href: `/${segments.slice(0, i + 1).join('/')}/` }));

    return (
        <nav
            aria-label="Breadcrumb"
            className="mb-3 flex flex-wrap items-center gap-1.5 font-mono text-[0.72rem] text-fg-mute"
        >
            {displaySegments.map(({ label, href }, i) => {
                const isLast = i === displaySegments.length - 1;
                return (
                    <Fragment key={`${label}-${i}`}>
                        {i > 0 ? <span className="text-border-strong">/</span> : null}
                        {isLast ? (
                            <span className={leafColor}>{label}</span>
                        ) : href ? (
                            <Link href={href} className="text-fg-mute transition-colors hover:text-brand">
                                {label}
                            </Link>
                        ) : (
                            <span className="text-fg-mute">{label}</span>
                        )}
                    </Fragment>
                );
            })}
        </nav>
    );
}
