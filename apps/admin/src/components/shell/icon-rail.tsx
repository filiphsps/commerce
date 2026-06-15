'use client';

import { Tooltip } from '@nordcom/nordstar';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { NavItem } from '@/components/ui/nav-item';
import { ScrollArea } from '@/components/ui/scroll-area';

export type IconRailItem = {
    href: Route;
    label: string;
    icon: ReactNode;
    disabled?: boolean;
};

export type IconRailProps = {
    items: IconRailItem[];
    /** When false, render icon-only with hover tooltips. When true, render labels alongside icons. */
    expanded: boolean;
};

/**
 * Vertical navigation rail that renders labeled nav items or icon-only items with tooltips.
 *
 * @param props.items - Navigation entries; each has an href, label, icon, and optional disabled state.
 * @param props.expanded - When true, labels are rendered alongside icons; when false, only icons with hover tooltips.
 */
export function IconRail({ items, expanded }: IconRailProps) {
    return (
        <Tooltip.Provider delayDuration={200}>
            <ScrollArea className="h-full">
                <nav className="flex w-full flex-col gap-1 p-2">
                    {items.map((item) => {
                        const inner = (
                            <NavItem
                                href={item.href}
                                iconOnly={!expanded}
                                disabled={item.disabled}
                                aria-label={!expanded ? item.label : undefined}
                            >
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
                                {expanded ? <span className="truncate">{item.label}</span> : null}
                            </NavItem>
                        );
                        if (expanded) return <div key={item.href}>{inner}</div>;
                        return (
                            <Tooltip key={item.href}>
                                <Tooltip.Trigger asChild>
                                    <div>{inner}</div>
                                </Tooltip.Trigger>
                                <Tooltip.Content side="right">{item.label}</Tooltip.Content>
                            </Tooltip>
                        );
                    })}
                </nav>
            </ScrollArea>
        </Tooltip.Provider>
    );
}
