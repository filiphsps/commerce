'use client';

import { resolveLink } from '@nordcom/commerce-cms/api';
import type { Header, Media } from '@nordcom/commerce-cms/types';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useDetectClickOutside } from 'react-detect-click-outside';
import Link from '@/components/link';
import { cn } from '@/utils/tailwind';
import { unsafe_cast } from '@/utils/unsafe-cast';

type NavItem = NonNullable<Header['items']>[number];
type Level2Item = NonNullable<NavItem['items']>[number];
type Level3Item = NonNullable<Level2Item['items']>[number];

const isPopulatedMedia = (v: string | Media | null | undefined): v is Media => !!v && typeof v !== 'string';

// Grace period before closing on mouse leave so the user can cross the
// trigger→panel gap without the panel snapping shut mid-traversal.
const HOVER_CLOSE_DELAY_MS = 150;

export function HeaderMenuTrigger({ item, locale }: { item: NavItem; locale: { code: string } }) {
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const [hoverCapable, setHoverCapable] = useState(false);
    const pathname = usePathname();
    const containerRef = useDetectClickOutside({ onTriggered: () => setOpen(false), disableTouch: false });
    const previouslyFocused = useRef<HTMLElement | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Detect hover-capable pointer (desktop mouse / trackpad). Touch devices
    // report `pointer: coarse` and never `hover: hover`, so we fall back to
    // click-to-toggle there — hover-only menus are unreachable on touch.
    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
        setHoverCapable(mq.matches);
        const onChange = (e: MediaQueryListEvent) => setHoverCapable(e.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    // Close on route change. `pathname` is intentionally the trigger.
    // biome-ignore lint/correctness/useExhaustiveDependencies: pathname change is the intended effect trigger
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // Escape closes; restore focus to trigger button.
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
                previouslyFocused.current?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    // Clear any pending hover-close timer on unmount so a stale callback
    // can't flip `open` after the component has gone away.
    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const cancelClose = useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    }, []);

    const scheduleClose = useCallback(() => {
        cancelClose();
        closeTimerRef.current = setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
    }, [cancelClose]);

    const handlePointerEnter = useCallback(() => {
        if (!hoverCapable) return;
        cancelClose();
        setOpen(true);
    }, [hoverCapable, cancelClose]);

    const handlePointerLeave = useCallback(() => {
        if (!hoverCapable) return;
        scheduleClose();
    }, [hoverCapable, scheduleClose]);

    const handleToggle = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        previouslyFocused.current = e.currentTarget;
        setOpen((prev) => !prev);
    }, []);

    return (
        // react-detect-click-outside declares its return as MutableRefObject<null>
        // rather than MutableRefObject<HTMLElement>; the ref is attached to the
        // correct element at runtime, so this cast to the narrower div type is safe.
        <div
            ref={unsafe_cast<React.RefObject<HTMLDivElement>>(containerRef)}
            className="relative inline-block"
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
        >
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={`Menu: ${item.link?.label ?? 'navigation'}`}
                onClick={handleToggle}
                onFocus={(e) => {
                    previouslyFocused.current = e.currentTarget;
                }}
                className={cn(
                    'group flex items-center gap-1 font-medium text-base leading-none',
                    'hover:text-primary focus-visible:text-primary',
                )}
            >
                {item.link?.label}
            </button>

            {open ? (
                // `pt-2` lives on the absolute-positioned wrapper rather than
                // as a margin on the panel so the trigger→panel hit area is
                // continuous — without it the user crosses a dead zone and
                // the hover-close timer fires mid-traversal.
                <div className="absolute top-full left-0 z-30 pt-2">
                    <div
                        id={menuId}
                        role="menu"
                        aria-label={item.link?.label ?? 'navigation'}
                        className={cn('min-w-[20rem]', 'rounded-lg border border-gray-200 bg-white p-3 shadow-lg')}
                    >
                        <MegaMenuPanel item={item} locale={locale} />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
HeaderMenuTrigger.displayName = 'Nordcom.Header.HeaderMenuTrigger';

function MegaMenuPanel({ item, locale }: { item: NavItem; locale: { code: string } }) {
    const level2Items = item.items ?? [];
    if (level2Items.length === 0) return null;

    return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(level2Items as Level2Item[]).map((l2, i) => (
                <Level2Tile key={l2.id ?? `l2-${i}`} item={l2} locale={locale} />
            ))}
        </div>
    );
}

function Level2Tile({ item, locale }: { item: Level2Item; locale: { code: string } }) {
    const link = item.link;
    if (!link) return null;

    const href = resolveLink(link as never, { locale: { code: locale.code } });
    const image = isPopulatedMedia(item.image) ? item.image : null;
    const description = item.description?.trim() || null;
    const background = item.backgroundColor || undefined;
    const children = (item.items ?? []) as Level3Item[];

    return (
        <div
            className="overflow-hidden rounded-lg border border-gray-200 transition-colors focus-within:border-primary hover:border-primary"
            style={background ? { backgroundColor: background } : undefined}
        >
            <Link
                href={href || '/'}
                target={link.openInNewTab ? '_blank' : undefined}
                role="menuitem"
                className="group block"
            >
                {image?.url ? (
                    <div className="relative aspect-4/3 w-full overflow-hidden">
                        <Image
                            src={image.url}
                            alt={image.alt ?? link.label ?? ''}
                            fill={true}
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 300px"
                            draggable={false}
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                ) : null}
                <div className="flex flex-col gap-1 p-3">
                    <span className="font-semibold text-lg leading-tight">{link.label}</span>
                    {description ? <span className="text-gray-600 text-sm leading-snug">{description}</span> : null}
                </div>
            </Link>

            {children.length > 0 ? (
                <ul className="border-gray-200 border-t px-3 py-2">
                    {children.map((l3, i) => {
                        const childLink = l3.link;
                        if (!childLink) return null;
                        const childHref = resolveLink(childLink as never, { locale: { code: locale.code } });
                        return (
                            <li key={l3.id ?? `l3-${i}`}>
                                <Link
                                    href={childHref || '/'}
                                    target={childLink.openInNewTab ? '_blank' : undefined}
                                    role="menuitem"
                                    className="block py-1 text-gray-700 text-sm hover:text-primary focus-visible:text-primary"
                                >
                                    {childLink.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </div>
    );
}

/** Legacy export kept as a no-op for source compat with old import paths. */
export function HeaderMenu() {
    return null;
}
HeaderMenu.displayName = 'Nordcom.Header.HeaderMenu';
