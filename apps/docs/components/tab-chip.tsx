'use client';

import { usePathname } from 'next/navigation';

type ChipVariant = {
    /** Display label shown inside the chip. */
    label: string;
    /** Tailwind class string that paints the semantic neon (border + text). */
    color: string;
};

const VARIANTS: Record<string, ChipVariant> = {
    docs: { label: 'Docs', color: 'border-brand text-brand' },
    packages: { label: 'Packages', color: 'border-pkg text-pkg' },
    reference: { label: 'Reference', color: 'border-ref text-ref' },
    errors: { label: 'Errors', color: 'border-err text-err' },
};

/**
 * Sidebar banner that prints the active tab name as a colored, bordered chip
 * (e.g. `[ ERRORS ]` in amber on every `/errors/*` page). Anchors the sidebar
 * so the user always knows which top-level tab they're inside. Reference:
 * visuals/04-page-errors.html, visuals/06-sidebar-states.html.
 *
 * @returns A bordered chip element, or `null` when the path is not under one
 *   of the four canonical tabs.
 */
export function TabChip() {
    const path = usePathname();
    const segment = path.split('/').filter(Boolean)[0] ?? 'docs';
    const variant = VARIANTS[segment] ?? VARIANTS.docs;
    if (!variant) return null;
    return (
        <span
            className={`mb-4 inline-block whitespace-nowrap rounded-[4px] border-[0.138rem] px-2.5 py-1 font-bold text-[0.58rem] uppercase tracking-[0.16em] ${variant.color}`}
        >
            {variant.label}
        </span>
    );
}
