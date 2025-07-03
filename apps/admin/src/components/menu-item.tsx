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
        if (href.toString().split('/')[2] === '') {
            setActive(href.toString().toLowerCase().startsWith(pathname.toLowerCase()));
            return;
        }

        setActive(pathname.toLowerCase().startsWith(href.toString().toLowerCase()));
    }, [href, pathname]);

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
            {children as any}
        </Link>
    );
}
