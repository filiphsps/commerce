import type { ReactNode } from 'react';

import type { IconRailItem } from '@/components/shell/icon-rail';
import { cn } from '@/utils/tailwind';

export type MobileNavProps = {
    items: IconRailItem[];
    subnav: ReactNode;
};

export function MobileNav({ items, subnav }: MobileNavProps) {
    return (
        <nav className="flex flex-col gap-1">
            {items.map((item) => (
                <a
                    key={item.href}
                    href={item.href}
                    className={cn(
                        'flex w-full items-center gap-2 rounded-md border-2 border-transparent px-3 py-2 font-bold uppercase tracking-wide hover:bg-muted',
                    )}
                >
                    {item.icon}
                    {item.label}
                </a>
            ))}
            {subnav ? <div className="mt-4 border-0 border-border border-t-2 pt-4">{subnav}</div> : null}
        </nav>
    );
}
