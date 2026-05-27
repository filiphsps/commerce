'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { HTMLAttributes } from 'react';

type Tab = {
    /** First path segment that activates this tab (`''` for Docs root). */
    segment: string;
    /** Destination URL. */
    href: string;
    /** Display label shown inside the chip. */
    label: string;
    /** Tailwind class string that paints the semantic neon (border + text). */
    color: string;
};

const TABS: Tab[] = [
    { segment: '', href: '/', label: 'Docs', color: 'border-brand text-brand' },
    { segment: 'packages', href: '/packages/', label: 'Packages', color: 'border-pkg text-pkg' },
    { segment: 'reference', href: '/reference/', label: 'Reference', color: 'border-ref text-ref' },
    { segment: 'errors', href: '/errors/', label: 'Errors', color: 'border-err text-err' },
];

type TabChipBannerProps = HTMLAttributes<HTMLDivElement>;

/**
 * Sidebar banner — replaces Fumadocs's default sidebar header. On desktop
 * it shows only the active tab as a chip (the topbar tabs handle switching
 * at `md+`). Below `md` the row becomes a compact four-tab switcher so the
 * mobile drawer remains the single entry point for cross-tab navigation —
 * the topbar tab-pill is hidden on narrow viewports per visuals/05/06.
 *
 * Passing this as a function-shaped `banner` lets Fumadocs render it with
 * `createElement(banner, props)`, avoiding the React keyed-list warning
 * Fumadocs emits when it concatenates `[children, banner]` itself.
 *
 * @param props - DOM attributes Fumadocs forwards to the wrapper.
 * @returns The wrapper div containing the tab chip / tab switcher.
 */
export function TabChip(props: TabChipBannerProps) {
    const path = usePathname();
    const first = path.split('/').filter(Boolean)[0] ?? '';
    const activeSegment = TABS.some((t) => t.segment === first) ? first : '';
    const activeTab = TABS.find((t) => t.segment === activeSegment) ?? TABS[0]!;

    return (
        <div {...props} className={`flex flex-col gap-3 p-4 pb-2 ${props.className ?? ''}`}>
            <span
                className={`hidden w-fit whitespace-nowrap rounded-[4px] border-[0.138rem] px-2 py-1 font-bold text-[0.58rem] uppercase tracking-[0.16em] md:inline-block ${activeTab.color}`}
            >
                {activeTab.label}
            </span>

            <nav aria-label="Sections" className="grid grid-cols-2 gap-1.5 md:hidden">
                {TABS.map((tab) => {
                    const isActive = tab.segment === activeSegment;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            data-active={isActive ? 'true' : 'false'}
                            className={`flex items-center justify-center rounded-[0.3rem] border-[0.138rem] px-2 py-2 font-bold text-[0.58rem] uppercase tracking-[0.16em] no-underline transition-colors ${
                                isActive
                                    ? `${tab.color} bg-bg-1`
                                    : 'border-border text-fg-mute hover:border-border-strong hover:text-fg'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
