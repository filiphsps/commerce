'use client';

import { usePathname } from 'next/navigation';
import type { HTMLAttributes } from 'react';

type ChipVariant = {
    /** Display label shown inside the chip. */
    label: string;
    /** Tailwind class string that paints the semantic neon (border + text). */
    color: string;
};

const DEFAULT_VARIANT: ChipVariant = { label: 'Docs', color: 'border-brand text-brand' };

const VARIANTS: Record<string, ChipVariant> = {
    docs: DEFAULT_VARIANT,
    packages: { label: 'Packages', color: 'border-pkg text-pkg' },
    reference: { label: 'Reference', color: 'border-ref text-ref' },
    errors: { label: 'Errors', color: 'border-err text-err' },
};

type TabChipBannerProps = HTMLAttributes<HTMLDivElement>;

/**
 * Sidebar banner — replaces Fumadocs's default sidebar header. Renders only
 * the active tab chip (the four-tab navbar at the top of every page already
 * lets users switch sections, so the mobile-only dropdown Fumadocs places
 * here is redundant). Reference: visuals/04-page-errors.html,
 * visuals/06-sidebar-states.html.
 *
 * Passing this as a function-shaped `banner` lets Fumadocs render it with
 * `createElement(banner, props)`, avoiding the React keyed-list warning
 * Fumadocs emits when it concatenates `[children, banner]` itself.
 *
 * @param props - DOM attributes Fumadocs forwards to the wrapper.
 * @returns The wrapper div containing the active tab chip.
 */
export function TabChip(props: TabChipBannerProps) {
    const path = usePathname();
    const segment = path.split('/').filter(Boolean)[0] ?? 'docs';
    const variant = VARIANTS[segment] ?? DEFAULT_VARIANT;
    return (
        <div {...props} className={`flex flex-col gap-3 p-4 pb-2 ${props.className ?? ''}`}>
            <span
                className={`inline-block w-fit whitespace-nowrap rounded-[4px] border-[0.138rem] px-3 py-1.5 font-extrabold text-[0.7rem] uppercase tracking-[0.18em] ${variant.color}`}
            >
                {variant.label}
            </span>
        </div>
    );
}
