'use client';

import { type ComponentProps, type ReactNode } from 'react';

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

    const hrefString = href.toString();
    const active =
        hrefString.split('/')[2] === ''
            ? hrefString.toLowerCase().startsWith(pathname.toLowerCase())
            : pathname.toLowerCase().startsWith(hrefString.toLowerCase());

    return (
        <Link
            href={href}
            className={cn(
                'text-foreground flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 font-semibold',
                active && 'bg-muted cursor-default font-extrabold uppercase',
                !active && 'hover:text-primary cursor-pointer',
                className
            )}
        >
            {children}
        </Link>
    );
}
