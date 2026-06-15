'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps, ReactNode } from 'react';

import { isHrefActive } from '@/utils/active-nav';
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
    /**
     * Controlled active state. When provided it wins over the pathname heuristic — the caller has
     * already resolved the single active sibling (see {@link resolveActiveHref}). When omitted the
     * item self-detects via {@link isHrefActive}, which is fine for non-overlapping links.
     */
    active?: boolean;
    /**
     * When false, the active item skips its own accent bar — used by the icon rail, which draws one
     * shared sliding indicator across all items instead of per-item bars. Defaults to true.
     */
    showActiveBar?: boolean;
};

/**
 * Navigation link that highlights when active. Active state is either controlled via the `active`
 * prop or self-detected from the current pathname at a segment boundary. Renders a non-interactive
 * aria-disabled span when disabled.
 *
 * @param props.href - Destination route.
 * @param props.children - Link content; typically an icon and label.
 * @param props.className - Additional class names merged onto the element.
 * @param props.disabled - When true, renders a non-interactive aria-disabled span.
 * @param props.iconOnly - When true, collapses horizontal padding for icon-only rendering.
 * @param props.active - Controlled active state; overrides pathname self-detection when set.
 * @param props.showActiveBar - When false, suppresses the per-item accent bar (rail draws its own).
 * @param props['aria-label'] - Accessible label, useful for icon-only items without visible text.
 */
export function NavItem({
    href,
    children,
    className,
    disabled,
    iconOnly,
    active: activeProp,
    showActiveBar = true,
    'aria-label': ariaLabel,
}: NavItemProps) {
    const pathname = usePathname();

    if (disabled) {
        return (
            <span
                aria-disabled="true"
                aria-label={ariaLabel}
                className={cn(
                    'flex w-full cursor-not-allowed items-center gap-2 rounded-md border-2 border-transparent px-3 py-2 font-bold text-muted-foreground/40',
                    iconOnly && 'justify-center px-2',
                    className,
                )}
            >
                {children}
            </span>
        );
    }

    const active = activeProp ?? isHrefActive(pathname, href.toString());

    return (
        <Link
            href={href}
            aria-label={ariaLabel}
            aria-current={active ? 'page' : undefined}
            data-active={active ? 'true' : undefined}
            className={cn(
                'relative flex w-full select-none items-center gap-2 rounded-md border-2 border-transparent px-3 py-2 font-bold transition-colors duration-150',
                active
                    ? 'cursor-default bg-muted text-foreground'
                    : 'cursor-pointer text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                iconOnly && 'justify-center px-2',
                className,
            )}
        >
            {active && showActiveBar ? (
                <span
                    aria-hidden="true"
                    className={cn(
                        'absolute top-1/2 left-0 h-3/5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary',
                        'motion-safe:fade-in motion-safe:slide-in-from-left-1 motion-safe:animate-in motion-safe:duration-200',
                    )}
                />
            ) : null}
            {children}
        </Link>
    );
}
