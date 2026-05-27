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

/**
 * Navigation link that highlights as active when the current pathname starts with its href.
 * Renders as a non-interactive aria-disabled span when disabled.
 *
 * @param props.href - Destination route.
 * @param props.children - Link content; typically an icon and label.
 * @param props.className - Additional class names merged onto the element.
 * @param props.disabled - When true, renders a non-interactive aria-disabled span.
 * @param props.iconOnly - When true, collapses horizontal padding for icon-only rendering.
 * @param props['aria-label'] - Accessible label, useful for icon-only items without visible text.
 */
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
                'flex w-full select-none items-center gap-2 rounded-md border-2 border-transparent px-3 py-2 font-bold text-foreground transition-colors',
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
