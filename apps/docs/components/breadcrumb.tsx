'use client';

import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { Fragment } from 'react';

/**
 * Convert a URL slug segment to a human-readable label. Splits on hyphens,
 * capitalizes the first word only (sentence case), joining with spaces.
 * e.g. "get-started" → "Get started", "quickstart" → "Quickstart".
 *
 * @param slug - The raw URL segment.
 * @returns The formatted label string.
 */
function slugToLabel(slug: string): string {
    const words = slug.split('-');
    return [(words[0] ?? '').charAt(0).toUpperCase() + (words[0] ?? '').slice(1), ...words.slice(1)].join(' ');
}

/**
 * URL-driven breadcrumb that paints each path segment as a slash-separated
 * link, leaf in the foreground color. Replaces Fumadocs's default
 * tree-driven breadcrumb to match visual 02 / 04 (mono caption, `/`
 * separators, fg-mute links, fg leaf). Segments are converted from kebab
 * slugs to sentence-case labels via {@link slugToLabel}.
 *
 * @returns The breadcrumb nav, or null at the root.
 */
export function Breadcrumb() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    return (
        <nav
            aria-label="Breadcrumb"
            className="mb-3 flex flex-wrap items-center gap-1.5 font-mono text-[0.72rem] text-fg-mute"
        >
            {segments.map((seg, i) => {
                const href = `/${segments.slice(0, i + 1).join('/')}/`;
                const isLast = i === segments.length - 1;
                const label = slugToLabel(seg);
                return (
                    <Fragment key={`${seg}-${i}`}>
                        {i > 0 ? <span className="text-border-strong">/</span> : null}
                        {isLast ? (
                            <span className="text-fg">{label}</span>
                        ) : (
                            <Link href={href} className="text-fg-mute transition-colors hover:text-brand">
                                {label}
                            </Link>
                        )}
                    </Fragment>
                );
            })}
        </nav>
    );
}
