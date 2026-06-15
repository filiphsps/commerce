'use client';

import { Tooltip } from '@nordcom/nordstar';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { Fragment, type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { NavItem } from '@/components/ui/nav-item';
import { ScrollArea } from '@/components/ui/scroll-area';
import { resolveActiveHref } from '@/utils/active-nav';
import { cn } from '@/utils/tailwind';

export type IconRailItem = {
    href: Route;
    label: string;
    icon: ReactNode;
    disabled?: boolean;
};

export type IconRailGroup = {
    /** Stable key for the group. */
    id: string;
    /** Section eyebrow shown when the rail is expanded; omit for an unlabeled lead group. */
    label?: string;
    items: IconRailItem[];
};

export type IconRailProps = {
    groups: IconRailGroup[];
    /** When false, render icon-only with hover tooltips. When true, render labels alongside icons. */
    expanded: boolean;
};

/** Geometry of the sliding active indicator, in pixels relative to the nav's padding box. */
type IndicatorRect = { top: number; height: number } | null;

/** Fraction of an item's height the accent bar spans, centered vertically. */
const BAR_HEIGHT_RATIO = 0.6;

/**
 * Vertical navigation rail. Renders grouped nav items — labeled with section eyebrows when expanded,
 * icon-only with hover tooltips and inter-group dividers when collapsed. A single pink accent bar
 * slides between items to mark the active route, resolved as the most specific matching link so
 * overlapping sections (Settings vs. Users) never both light up.
 *
 * @param props.groups - Ordered nav sections; each has a stable id, an optional eyebrow label, and items.
 * @param props.expanded - When true, labels and eyebrows render; when false, icon-only with tooltips.
 */
export function IconRail({ groups, expanded }: IconRailProps) {
    const pathname = usePathname();
    const allHrefs = groups.flatMap((group) => group.items.map((item) => item.href.toString()));
    const activeHref = resolveActiveHref(pathname, allHrefs);

    const navRef = useRef<HTMLElement | null>(null);
    const itemRefs = useRef(new Map<string, HTMLLIElement>());
    const [indicator, setIndicator] = useState<IndicatorRect>(null);
    // Suppress the slide transition on the very first placement so the bar appears in position
    // instead of animating in from the top edge.
    const hasPlacedRef = useRef(false);
    const [animate, setAnimate] = useState(false);

    useLayoutEffect(() => {
        const el = activeHref ? itemRefs.current.get(activeHref) : undefined;
        if (!el) {
            setIndicator(null);
            hasPlacedRef.current = false;
            return;
        }

        const measure = () => {
            const height = Math.round(el.offsetHeight * BAR_HEIGHT_RATIO);
            const top = el.offsetTop + Math.round((el.offsetHeight - height) / 2);
            setIndicator({ top, height });
            if (hasPlacedRef.current) {
                setAnimate(true);
            } else {
                hasPlacedRef.current = true;
            }
        };
        measure();

        if (typeof ResizeObserver === 'undefined') return;
        // The nav observer re-measures on layout shifts (expand/collapse, group changes) without
        // needing those as effect deps; activeHref repoints the bar to the newly active item.
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        if (navRef.current) ro.observe(navRef.current);
        return () => ro.disconnect();
    }, [activeHref]);

    let renderIndex = 0;

    return (
        <Tooltip.Provider delayDuration={200}>
            <ScrollArea className="h-full">
                <nav ref={navRef} aria-label="Primary" className="relative flex w-full flex-col gap-1 p-2">
                    {indicator ? (
                        <span
                            aria-hidden="true"
                            className={cn(
                                'pointer-events-none absolute left-0 w-[3px] rounded-r-full bg-primary',
                                animate && 'motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out',
                            )}
                            style={{ top: indicator.top, height: indicator.height }}
                        />
                    ) : null}

                    {groups.map((group, groupIndex) => (
                        <Fragment key={group.id}>
                            {groupIndex > 0 ? (
                                expanded ? null : (
                                    <div role="presentation" className="mx-2 my-1 border-border border-t" />
                                )
                            ) : null}
                            {expanded && group.label ? (
                                <p className="px-3 pt-2 pb-1 font-bold text-[0.625rem] text-muted-foreground/70 uppercase tracking-[0.12em]">
                                    {group.label}
                                </p>
                            ) : null}
                            <ul className="flex flex-col gap-1">
                                {group.items.map((item) => {
                                    const active = activeHref === item.href.toString();
                                    const delay = Math.min(renderIndex * 25, 200);
                                    renderIndex += 1;
                                    const inner = (
                                        <NavItem
                                            href={item.href}
                                            iconOnly={!expanded}
                                            disabled={item.disabled}
                                            active={active}
                                            showActiveBar={false}
                                            aria-label={!expanded ? item.label : undefined}
                                        >
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                                                {item.icon}
                                            </span>
                                            {expanded ? <span className="truncate">{item.label}</span> : null}
                                        </NavItem>
                                    );
                                    return (
                                        <li
                                            key={item.href}
                                            ref={(el) => {
                                                const key = item.href.toString();
                                                if (el) itemRefs.current.set(key, el);
                                                else itemRefs.current.delete(key);
                                            }}
                                            className="motion-safe:fade-in motion-safe:slide-in-from-left-2 motion-safe:animate-in motion-safe:fill-mode-both"
                                            style={{ animationDelay: `${delay}ms`, animationDuration: '300ms' }}
                                        >
                                            {expanded ? (
                                                inner
                                            ) : (
                                                <Tooltip>
                                                    <Tooltip.Trigger asChild>
                                                        <div>{inner}</div>
                                                    </Tooltip.Trigger>
                                                    <Tooltip.Content side="right">{item.label}</Tooltip.Content>
                                                </Tooltip>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </Fragment>
                    ))}
                </nav>
            </ScrollArea>
        </Tooltip.Provider>
    );
}
