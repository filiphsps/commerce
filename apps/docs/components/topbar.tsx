'use client';

import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { useNotebookLayout } from 'fumadocs-ui/layouts/notebook';
import { isLayoutTabActive } from 'fumadocs-ui/layouts/shared';
import type { ComponentProps } from 'react';

function SidebarIcon({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 3v18" />
        </svg>
    );
}

/**
 * Custom Header slot. Single-row layout per visual 02 — logo on the
 * left, tab pill bar centered, search trigger + utility icons on the
 * right. Replaces Fumadocs's default 2-row notebook header so the desktop
 * chrome matches the mockup exactly. Tabs hide below `md` and surface in
 * the sidebar instead.
 *
 * @param props - Forwarded `<header>` attributes (className, data props).
 * @returns The rendered topbar.
 */
export function Topbar(props: ComponentProps<'header'>) {
    const {
        slots,
        navItems,
        isNavTransparent,
        props: { tabs },
    } = useNotebookLayout();
    const pathname = usePathname();
    // findLastIndex returns -1 when the Docs tab URL '/' doesn't prefix-match sub-pages
    // like /introduction/ (startsWith('//') is always false). Default to 0 (Docs).
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
            className={`sticky top-(--fd-docs-row-1) z-30 grid h-18 grid-cols-[auto_1fr_auto] items-center gap-4 border-border border-b-[0.2rem] bg-fd-background/85 px-4 backdrop-blur transition-colors [grid-area:header] layout:[--fd-header-height:--spacing(14)] md:px-6 ${props.className ?? ''}`}
        >
            <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-1 empty:hidden">
                    {navItems
                        .filter((item) => item.type === 'icon')
                        .map((item, i) =>
                            'url' in item ? (
                                <Link
                                    key={i}
                                    href={item.url}
                                    aria-label={item.label}
                                    external={item.external}
                                    className="grid h-8 w-8 place-items-center rounded-md text-fg-mute transition-colors hover:bg-bg-2 hover:text-fg"
                                >
                                    {item.icon}
                                </Link>
                            ) : null,
                        )}
                </div>

                {slots.themeSwitch ? <slots.themeSwitch /> : null}

                {sidebarSlot ? (
                    <>
                        <sidebarSlot.collapseTrigger className="hidden h-8 w-8 place-items-center rounded-md text-fg-mute transition-colors hover:bg-bg-2 hover:text-fg md:grid">
                            <SidebarIcon />
                        </sidebarSlot.collapseTrigger>
                        <sidebarSlot.trigger className="grid h-8 w-8 place-items-center rounded-md text-fg-mute transition-colors hover:bg-bg-2 hover:text-fg md:hidden">
                            <SidebarIcon />
                        </sidebarSlot.trigger>
                    </>
                ) : null}
            </div>
        </header>
    );
}
