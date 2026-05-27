'use client';

import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { useNotebookLayout } from 'fumadocs-ui/layouts/notebook';
import { isLayoutTabActive } from 'fumadocs-ui/layouts/shared';
import type { ComponentProps } from 'react';

function HamburgerIcon({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
    );
}

/**
 * Custom Header slot. Single-row layout per visuals/05 — logo on the
 * left, tab pill bar centered, search trigger on the right. The mockup
 * carries no GitHub icon, theme switch, or sidebar toggle in chrome;
 * theme follows OS preference. On mobile (below `md`) a hamburger button
 * sits to the left of the logo to open the sidebar drawer, since the
 * static sidebar collapses on narrow viewports.
 *
 * @param props - Forwarded `<header>` attributes (className, data props).
 * @returns The rendered topbar.
 */
export function Topbar(props: ComponentProps<'header'>) {
    const {
        slots,
        isNavTransparent,
        props: { tabs },
    } = useNotebookLayout();
    const pathname = usePathname();
    const activeIdx = Math.max(
        0,
        tabs.findLastIndex((tab) => isLayoutTabActive(tab, pathname)),
    );
    const sidebarSlot = slots.sidebar;
    const open = sidebarSlot?.useSidebar?.().open ?? false;

    return (
        <header
            id="nd-subnav"
            data-transparent={isNavTransparent && !open}
            {...props}
            className={`sticky top-(--fd-docs-row-1) z-30 grid h-14 grid-cols-[auto_1fr_auto] items-center gap-3 border-border border-b-[0.2rem] bg-fd-background/85 px-4 backdrop-blur transition-colors [grid-area:header] layout:[--fd-header-height:--spacing(14)] md:gap-4 md:px-6 ${props.className ?? ''}`}
        >
            <div className="flex items-center gap-2">
                {sidebarSlot ? (
                    <sidebarSlot.trigger
                        aria-label="Open navigation"
                        className="grid h-9 w-9 place-items-center rounded-[0.3rem] border-[0.138rem] border-border text-fg-mute transition-colors hover:border-brand hover:text-fg md:hidden"
                    >
                        <HamburgerIcon />
                    </sidebarSlot.trigger>
                ) : null}
                {slots.navTitle ? <slots.navTitle className="inline-flex items-center gap-2.5 font-semibold" /> : null}
            </div>

            {tabs.length > 0 ? (
                <nav
                    aria-label="Sections"
                    data-header-tabs=""
                    className="hidden items-center justify-self-center rounded-[0.45rem] border-[0.138rem] border-border p-[0.18rem] transition-colors hover:border-border-strong md:flex"
                >
                    {tabs.map((tab, i) => {
                        const isActive = activeIdx === i;
                        return (
                            <Link
                                key={tab.url}
                                href={tab.url}
                                data-active={isActive ? 'true' : 'false'}
                                className={`rounded-[0.3rem] px-3.5 py-1.5 font-bold text-[0.7rem] uppercase tracking-widest transition-colors ${
                                    isActive
                                        ? 'bg-brand text-black shadow-[0_0_14px_hsl(330_86%_53%/_0.45)]'
                                        : 'text-fg-mute hover:bg-bg-2 hover:text-fg'
                                }`}
                            >
                                {tab.title}
                            </Link>
                        );
                    })}
                </nav>
            ) : (
                <span aria-hidden />
            )}

            <div className="flex items-center justify-end gap-2">
                {slots.searchTrigger ? (
                    <>
                        <slots.searchTrigger.full
                            hideIfDisabled
                            className="hidden w-full max-w-65 rounded-[0.45rem] border-[0.138rem] border-border bg-transparent px-3 py-1.5 font-mono text-[0.72rem] text-fg-mute transition-colors hover:border-border-strong hover:text-fg lg:flex"
                        />
                        <slots.searchTrigger.sm hideIfDisabled className="p-2 lg:hidden" />
                    </>
                ) : null}
            </div>
        </header>
    );
}
