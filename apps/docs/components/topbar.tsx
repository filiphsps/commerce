'use client';

import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { useNotebookLayout } from 'fumadocs-ui/layouts/notebook';
import { isLayoutTabActive } from 'fumadocs-ui/layouts/shared';
import type { ComponentProps } from 'react';

/**
 * Custom Header slot. Single-row layout per visuals/05 — logo on the
 * left, tab pill bar centered, search trigger on the right. The mockup
 * carries no GitHub icon, theme switch, or sidebar toggle in chrome;
 * theme follows OS preference and the sidebar is statically visible.
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
            className={`sticky top-(--fd-docs-row-1) z-30 grid h-14 grid-cols-[auto_1fr_auto] items-center gap-4 border-border border-b-[0.2rem] bg-fd-background/85 px-4 backdrop-blur transition-colors [grid-area:header] layout:[--fd-header-height:--spacing(14)] md:px-6 ${props.className ?? ''}`}
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
            </div>
        </header>
    );
}
