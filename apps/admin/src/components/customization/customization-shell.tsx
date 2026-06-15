'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type KeyboardEvent, type ReactNode, useRef } from 'react';
import { cn } from '@/utils/tailwind';

/** One top-level tab of the Customization hub. */
export type CustomizationTab = {
    /** URL/id-safe slug used for the `?tab=` deep link and the tab/panel ids. */
    slug: string;
    /** Display label. */
    label: string;
    /** The tab's panel content. */
    content: ReactNode;
};

/**
 * Tabbed shell for the Customization hub. Renders a horizontal section tablist over the active tab's
 * panel, following the WAI-ARIA tabs pattern (roving `tabIndex`, `aria-selected`, `aria-controls`,
 * arrow/Home/End navigation with selection following focus) lifted from the theme editor so the hub
 * shares one chrome. The active tab is deep-linked via the `?tab=` search param so nav state survives
 * reload. Per-tab search lives inside each panel (the Theme tab carries its own); a hub-wide search is
 * deferred until the theme catalog migrates onto this shell.
 *
 * @param props.tabs - The ordered tab definitions.
 * @returns The tabbed hub surface.
 */
export function CustomizationShell({ tabs }: { tabs: CustomizationTab[] }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const requested = searchParams.get('tab');
    const requestedIndex = tabs.findIndex((tab) => tab.slug === requested);
    const activeIndex = requestedIndex === -1 ? 0 : requestedIndex;
    const active = tabs[activeIndex];

    const selectTab = (slug: string) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', slug);
        router.replace(`${pathname}?${next.toString()}` as Route, { scroll: false });
    };

    const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        const last = tabs.length - 1;
        let nextIndex: number | null = null;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = index === last ? 0 : index + 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = index === 0 ? last : index - 1;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = last;
        if (nextIndex === null) return;

        const target = tabs[nextIndex];
        if (!target) return;
        event.preventDefault();
        tabRefs.current[nextIndex]?.focus();
        selectTab(target.slug);
    };

    return (
        <div className="flex min-h-[60vh] flex-col gap-4">
            <div
                role="tablist"
                aria-label="Customization sections"
                aria-orientation="horizontal"
                className="flex flex-wrap gap-1 border-border border-b"
            >
                {tabs.map((tab, index) => {
                    const selected = index === activeIndex;
                    return (
                        <button
                            key={tab.slug}
                            ref={(node) => {
                                tabRefs.current[index] = node;
                            }}
                            type="button"
                            role="tab"
                            id={`customization-tab-${tab.slug}`}
                            aria-selected={selected}
                            aria-controls={`customization-panel-${tab.slug}`}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => selectTab(tab.slug)}
                            onKeyDown={(event) => onTabKeyDown(event, index)}
                            className={cn(
                                '-mb-px cursor-pointer border-b-2 px-3 py-2 font-bold text-sm uppercase tracking-wide transition-colors',
                                selected
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {active ? (
                <div
                    role="tabpanel"
                    id={`customization-panel-${active.slug}`}
                    aria-labelledby={`customization-tab-${active.slug}`}
                    tabIndex={0}
                    className="flex min-w-0 flex-col outline-none"
                >
                    {active.content}
                </div>
            ) : null}
        </div>
    );
}
