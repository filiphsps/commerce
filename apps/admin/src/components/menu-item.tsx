'use client';

import { type ComponentProps, type ReactNode, useEffect, useState } from 'react';

import { cn } from '@/utils/tailwind';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type MenuItemProps = {
    href: ComponentProps<typeof Link>['href'];
    children: ReactNode;
    className?: string;
};
export function MenuItem({ href, children, className }: MenuItemProps) {
    const pathname = usePathname();
    const [active, setActive] = useState(false);

    useEffect(() => {
        setActive(href.toString().toLowerCase().endsWith(pathname.toLowerCase()));
    }, [href, pathname]);

    return (
        <Link
            href={href}
            className={cn(
                'text-foreground flex w-full items-center justify-start gap-2 rounded-md px-3 py-2',
                active && 'bg-muted cursor-default',
                !active && 'hover:text-primary cursor-pointer',
                className
            )}
        >
            {children}
        </Link>
    );
}
