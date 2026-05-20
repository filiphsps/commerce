'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/utils/tailwind';

export type NavItemProps = {
    href: ComponentProps<typeof Link>['href'];
    children: ReactNode;
    className?: string;
    /** Accessible label, useful when rendering icon-only (no visible text). */
    'aria-label'?: string;
    /** When true, render as a non-interactive span with dimmed styling. */
    disabled?: boolean;
    /** When true, render label-less (icon-only). The children's first child should be the icon. */
    iconOnly?: boolean;
};

export function NavItem({ href, children, className, disabled, iconOnly, 'aria-label': ariaLabel }: NavItemProps) {
    const pathname = usePathname();

    if (disabled) {
        return (
            <span
                aria-disabled="true"
                aria-label={ariaLabel}
                className={cn(
                    'flex w-full cursor-not-allowed items-center gap-2 rounded-md border-2 border-transparent px-3 py-2 font-bold text-muted-foreground/50',
                    iconOnly && 'justify-center px-2',
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
            aria-label={ariaLabel}
            className={cn(
                'flex w-full items-center gap-2 rounded-md border-2 border-transparent px-3 py-2 font-bold text-foreground transition-colors',
                active && 'cursor-default border-border bg-muted uppercase tracking-wide',
                !active && 'cursor-pointer hover:bg-muted',
                iconOnly && 'justify-center px-2',
                className,
            )}
        >
            {children}
        </Link>
    );
}
