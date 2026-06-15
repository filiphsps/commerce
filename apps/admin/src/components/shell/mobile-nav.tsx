'use client';

import { usePathname } from 'next/navigation';
import { Fragment, type ReactNode } from 'react';

import type { IconRailGroup } from '@/components/shell/icon-rail';
import { NavItem } from '@/components/ui/nav-item';
import { resolveActiveHref } from '@/utils/active-nav';

export type MobileNavProps = {
    groups: IconRailGroup[];
    subnav: ReactNode;
};

/**
 * Stacked navigation for the mobile drawer: always-labeled nav items grouped under section eyebrows,
 * with the single most-specific active route highlighted (mirroring the desktop rail) and an optional
 * subnav section below a divider.
 *
 * @param props.groups - Navigation sections mirroring the desktop icon rail.
 * @param props.subnav - Optional secondary navigation rendered below a divider.
 */
export function MobileNav({ groups, subnav }: MobileNavProps) {
    const pathname = usePathname();
    const activeHref = resolveActiveHref(
        pathname,
        groups.flatMap((group) => group.items.map((item) => item.href.toString())),
    );

    return (
        <nav className="flex flex-col gap-1">
            {groups.map((group) => (
                <Fragment key={group.id}>
                    {group.label ? (
                        <p className="px-3 pt-3 pb-1 font-bold text-[0.625rem] text-muted-foreground/70 uppercase tracking-[0.12em]">
                            {group.label}
                        </p>
                    ) : null}
                    {group.items.map((item) => (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            disabled={item.disabled}
                            active={activeHref === item.href.toString()}
                        >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                        </NavItem>
                    ))}
                </Fragment>
            ))}
            {subnav ? <div className="mt-4 border-border border-t-2 pt-4">{subnav}</div> : null}
        </nav>
    );
}
