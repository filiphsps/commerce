'use client';

import { cn } from '@/utils/tailwind';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { ComponentProps, ReactNode } from 'react';

export type MenuItemProps = {
    href: ComponentProps<typeof Link>['href'];
    children: ReactNode;
    className?: string;
};
export function MenuItem({ href, children, className }: MenuItemProps) {
    const pathname = usePathname();
    const isActive = href.toString().endsWith(pathname);

    return (
        <Link href={href} className={cn('', isActive && 'text-primary', className)}>
            {children}
        </Link>
    );
}
