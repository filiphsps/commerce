'use client';

import type { Route } from 'next';
import type { ReactNode } from 'react';

import { NavItem } from '@/components/ui/nav-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

export function IconRail({ items, expanded }: IconRailProps) {
    return (
        <TooltipProvider delayDuration={200}>
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
                                <TooltipTrigger asChild>
                                    <div>{inner}</div>
                                </TooltipTrigger>
                                <TooltipContent side="right">{item.label}</TooltipContent>
                            </Tooltip>
                        );
                    })}
                </nav>
            </ScrollArea>
        </TooltipProvider>
    );
}
