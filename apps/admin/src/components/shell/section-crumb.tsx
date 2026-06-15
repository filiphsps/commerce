'use client';

import { ChevronRight } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { resolveActiveHref } from '@/utils/active-nav';

export type SectionCrumbSection = { label: string; href: string };

export type SectionCrumbProps = {
    sections: SectionCrumbSection[];
};

/**
 * Lightweight contextual crumb shown beside the shop switcher: a chevron plus the label of the nav
 * section the current route belongs to (the most specific match, so `/settings/users` reads "Users",
 * not "Settings"). It complements — never duplicates — the deeper per-page PageHeader breadcrumbs and
 * gives location context on tablet, where the desktop rail is collapsed into the drawer.
 *
 * Renders nothing when no section matches (keeps the bare shop root uncluttered).
 *
 * @param props.sections - Top-level nav sections (label + href) the active route is matched against.
 */
export function SectionCrumb({ sections }: SectionCrumbProps) {
    const pathname = usePathname();
    const activeHref = resolveActiveHref(
        pathname,
        sections.map((section) => section.href),
    );
    const active = activeHref ? sections.find((section) => section.href === activeHref) : null;
    if (!active) return null;

    return (
        <span className="hidden items-center gap-1.5 text-muted-foreground md:flex">
            <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 opacity-50" />
            <Link
                href={active.href as Route}
                data-testid="section-crumb"
                className="truncate font-bold text-foreground/80 text-sm uppercase tracking-wide transition-colors hover:text-foreground"
            >
                {active.label}
            </Link>
        </span>
    );
}
