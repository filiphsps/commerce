'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/utils/tailwind';

export type MenuItemProps = {
    href: ComponentProps<typeof Link>['href'];
    children: ReactNode;
    className?: string;
    /** When true the item renders as a non-interactive span with dimmed styling. */
    disabled?: boolean;
};
export function MenuItem({ href, children, className, disabled }: MenuItemProps) {
    const pathname = usePathname();

    if (disabled) {
        return (
            <span
                aria-disabled="true"
                className={cn(
                    'flex w-full cursor-not-allowed items-center justify-start gap-2 rounded-md px-3 py-2 font-semibold text-muted-foreground/50',
                    className,
                )}
            >
                {children}
            </span>
        );
    }

    const hrefString = href.toString();
    const active =
        hrefString.split('/')[2] === ''
            ? hrefString.toLowerCase().startsWith(pathname.toLowerCase())
            : pathname.toLowerCase().startsWith(hrefString.toLowerCase());

    return (
        <Link
            href={href}
            className={cn(
                'flex w-full items-center justify-start gap-2 rounded-md px-3 py-2 font-semibold text-foreground',
                active && 'cursor-default bg-muted font-extrabold uppercase',
                !active && 'cursor-pointer hover:text-primary',
                className,
            )}
        >
            {children}
        </Link>
    );
}
