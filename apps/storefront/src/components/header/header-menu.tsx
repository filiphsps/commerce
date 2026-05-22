'use client';

import { resolveLink } from '@nordcom/commerce-cms/api';
import type { Header, Media } from '@nordcom/commerce-cms/types';
import { ChevronDown as ChevronDownIcon } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from '@/components/link';
import { cn } from '@/utils/tailwind';

// Header-link styles ported from the pre-Prismic-removal storefront so
// nav items, triggers, and panel tiles share the original Nordcom
// "swedish-candy-store" look.
export const HEADER_LINK_STYLES =
    'group/menu-item flex h-full cursor-pointer select-none flex-nowrap items-center justify-center text-nowrap border-0 border-b-2 border-t-2 border-transparent border-solid bg-transparent my-4 font-medium leading-none transition-all md:my-3';
export const HEADER_LINK_BUBBLE_STYLES =
    '-mx-2 rounded-lg px-2 py-2 text-inherit group-hover/menu-item:bg-gray-100 group-focus-visible/menu-item:bg-gray-100';
export const HEADER_LINK_ACTIVE_MENU_STYLES = '-mx-2 bg-gray-100 px-2 font-semibold text-primary';
const PANEL_TILE_STYLES =
    'group/item relative flex h-full grow shrink-0 overflow-hidden rounded-xl border border-black/[0.06] border-solid bg-white transition-[border-color,box-shadow,transform] duration-200 ease-out hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 focus-within:border-primary/40 focus-within:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]';
const PANEL_TILE_TITLE_STYLES = 'py-2 font-semibold text-xl leading-tight tracking-tight';

type NavItem = NonNullable<Header['items']>[number];

// The CMS schema (`packages/cms/src/fields/nav-item.ts`) defines `items` as
// a recursive array — every level carries the same shape: `link`, `image`,
// `description`, `backgroundColor`, `items`. The generated payload types
// produce a different concrete type per nesting level, so we project them
// onto a single structural shape that the recursive renderer can walk
// without knowing the depth statically.
type RecursiveNavItem = {
    id?: string | null;
    link?: NavItem['link'];
    image?: NavItem['image'];
    description?: string | null;
    backgroundColor?: string | null;
    items?: RecursiveNavItem[] | null;
};

const isPopulatedMedia = (v: string | Media | null | undefined): v is Media => !!v && typeof v !== 'string';

// Grace period before closing on mouse leave so the user can cross the
// trigger→panel gap without the panel snapping shut mid-traversal.
const HOVER_CLOSE_DELAY_MS = 150;

export function HeaderMenuTrigger({ item, locale }: { item: NavItem; locale: { code: string } }) {
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const [hoverCapable, setHoverCapable] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const pathname = usePathname();
    const triggerRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const previouslyFocused = useRef<HTMLElement | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // `createPortal` needs a real DOM target — flip `mounted` after the
    // first client render so SSR markup doesn't try to reach `document`.
    useEffect(() => {
        setMounted(true);
    }, []);

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

    // Compute the portaled panel's anchor coordinates from the trigger's
    // current bounding rect; refresh on scroll/resize while open. We
    // portal into `document.body` and position with `fixed` so the panel
    // escapes the nav's overflow context entirely — that is what makes
    // the mega-menu work at both md+ (hover) and on mobile (click) where
    // the parent nav has `overflow-x-auto` forcing a clipped y axis.
    useLayoutEffect(() => {
        if (!open) return;
        const update = () => {
            const el = triggerRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setPosition({ top: rect.bottom, left: rect.left, width: rect.width });
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [open]);

    // Manual click-outside: the panel is portaled into <body>, so an
    // ancestor-ref helper (e.g. useDetectClickOutside) cannot see clicks
    // inside it. Close only when the target is outside BOTH the trigger
    // and the panel.
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node | null;
            if (!target) return;
            if (triggerRef.current?.contains(target)) return;
            if (panelRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, [open]);

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

    // Anchor the panel to the trigger's vertical position but span the
    // full viewport width — the inner card is clamped to `--page-width`
    // and centered. This mirrors the old swedish-candy-store mega-menu
    // (single full-width dropdown beneath the nav) and keeps the panel
    // from ever overflowing the viewport horizontally on mobile.
    const panel =
        open && position ? (
            <div
                ref={panelRef}
                id={menuId}
                role="menu"
                aria-label={item.link?.label ?? 'navigation'}
                onMouseEnter={handlePointerEnter}
                onMouseLeave={handlePointerLeave}
                style={{ position: 'fixed', top: position.top, left: 0, right: 0, zIndex: 50 }}
                className="animate-mega-menu-in pt-3"
            >
                <div className="mx-auto w-full max-w-(--page-width) px-2 md:px-3">
                    <div
                        data-header-panel
                        data-header-accent-rail="true"
                        className={cn(
                            'relative rounded-header-panel border border-[var(--header-divider-color)] bg-white p-header-panel',
                            'shadow-header-panel',
                            'before:pointer-events-none before:absolute before:top-0 before:right-0 before:left-0',
                            'before:h-[var(--header-rail-thickness)] before:bg-primary',
                            'before:rounded-tl-header-panel before:rounded-tr-header-panel',
                            'before:content-[""]',
                        )}
                    >
                        <MegaMenuPanel item={item} locale={locale} />
                    </div>
                </div>
            </div>
        ) : null;

    return (
        <div
            ref={triggerRef}
            className="inline-block"
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
        >
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={`Menu: ${item.link?.label ?? 'navigation'}`}
                data-header-active-bar={open ? 'true' : undefined}
                onClick={handleToggle}
                onFocus={(e) => {
                    previouslyFocused.current = e.currentTarget;
                }}
                className={cn(HEADER_LINK_STYLES, 'gap-1 text-base text-inherit')}
            >
                <span
                    className={cn(
                        HEADER_LINK_BUBBLE_STYLES,
                        'relative flex items-center gap-1',
                        open && HEADER_LINK_ACTIVE_MENU_STYLES,
                        open &&
                            'after:pointer-events-none after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[var(--header-rail-thickness)] after:bg-primary after:rounded-[1px] after:content-[""]',
                    )}
                >
                    {item.link?.label}
                    <ChevronDownIcon
                        aria-hidden={true}
                        className={cn(
                            'size-3.5 stroke-2 transition-transform duration-[var(--header-motion-base)] ease-[var(--header-easing-expo)]',
                            open && 'rotate-180',
                        )}
                    />
                </span>
            </button>

            {mounted && panel ? createPortal(panel, document.body) : null}
        </div>
    );
}
HeaderMenuTrigger.displayName = 'Nordcom.Header.HeaderMenuTrigger';

function MegaMenuPanel({ item, locale }: { item: NavItem; locale: { code: string } }) {
    // The runtime payload matches `RecursiveNavItem` at every depth even
    // though the generated CMS types diverge per level — project here once
    // so the recursive renderer never has to deal with the typed variants.
    const items = (item.items ?? []) as RecursiveNavItem[];
    if (items.length === 0) return null;

    return (
        <div className="flex flex-col gap-3 md:grid md:auto-rows-max md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((child, i) => (
                <MegaMenuItem key={child.id ?? `mm-1-${i}`} item={child} locale={locale} depth={1} />
            ))}
        </div>
    );
}

// Renders any depth of mega-menu item. Depth 1 is the column-style card
// (optional image header, label, description, `backgroundColor`); depth ≥ 2
// renders as compact list rows. Items without a `link` are rendered as a
// non-interactive heading so they can still group their children — that
// shape is legitimate in the CMS schema and dropping it produced an empty
// dropdown when the editor used label-only group items.
function MegaMenuItem({ item, locale, depth }: { item: RecursiveNavItem; locale: { code: string }; depth: number }) {
    const link = item.link;
    const label = link?.label ?? null;
    const href = link ? (resolveLink(link as never, { locale: { code: locale.code } }) ?? null) : null;
    const image = isPopulatedMedia(item.image) ? item.image : null;
    const description = item.description?.trim() || null;
    const background = item.backgroundColor || undefined;
    const children = (item.items ?? []) as RecursiveNavItem[];
    const hasChildren = children.length > 0;

    // Nothing worth rendering — skip the slot rather than emitting an empty
    // bordered card that looks broken in the dropdown.
    if (!label && !hasChildren) return null;

    const isTopLevel = depth === 1;
    const hasImage = isTopLevel && image?.url;

    // Image tile: title sits over the image with a layered gradient for
    // legibility. Drops the old WebkitTextStroke / paint-order trick — the
    // gradient + drop-shadow do the work without the skeuomorphic outline.
    const imageHeader = hasImage ? (
        <div
            className={cn(
                'relative h-full shrink-0 overflow-hidden text-primary-foreground',
                !background && 'bg-primary',
            )}
            style={background ? { backgroundColor: background } : undefined}
        >
            <Image
                src={image!.url!}
                alt={image!.alt ?? label ?? ''}
                fill={false}
                width={image!.width ?? 320}
                height={image!.height ?? 240}
                className="pointer-events-none h-full w-full object-cover object-center transition-transform duration-300 ease-out group-focus-within/item:scale-[1.04] group-hover/item:scale-[1.04]"
                sizes="(max-width: 768px) 90vw, 300px"
                draggable={false}
                loading="lazy"
                decoding="async"
            />
            <div
                aria-hidden={true}
                className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent"
            />
            {label ? (
                <div
                    className={cn(
                        'absolute inset-0 flex w-full items-end justify-start p-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]',
                        PANEL_TILE_TITLE_STYLES,
                    )}
                >
                    {label}
                </div>
            ) : null}
        </div>
    ) : null;

    // Items with children but no link of their own become eyebrow group
    // headings rather than interactive rows — keeps the IA scannable when
    // editors use label-only items as section grouping.
    const isGroupHeading = !isTopLevel && !href && hasChildren;

    const labelText = label ? (
        <span
            className={cn(
                isTopLevel && PANEL_TILE_TITLE_STYLES,
                !isTopLevel &&
                    !isGroupHeading &&
                    'font-medium text-gray-800 text-sm leading-tight transition-colors group-hover/sub-link:text-primary group-focus-visible/sub-link:text-primary',
                isGroupHeading &&
                    'block font-semibold text-[0.7rem] text-gray-500 uppercase leading-none tracking-[0.08em]',
            )}
        >
            {label}
        </span>
    ) : null;

    // Plain text block (used when there's no image, or rendered alongside
    // the image for the description).
    const labelBlock = (
        <div
            className={cn(
                'flex flex-col items-start justify-start gap-1 text-gray-600',
                isTopLevel ? 'p-3 group-focus-within/item:text-inherit group-hover/item:text-inherit' : 'py-1.5',
                hasImage && 'pt-2 empty:hidden',
            )}
        >
            {!hasImage ? labelText : null}
            {description ? (
                <span className={cn('leading-snug', isTopLevel ? 'text-sm' : 'text-[0.8125rem] text-gray-500')}>
                    {description}
                </span>
            ) : null}
        </div>
    );

    const titleEl = href ? (
        <Link
            href={href || '/'}
            target={link?.openInNewTab ? '_blank' : undefined}
            role="menuitem"
            className={cn(
                'block',
                isTopLevel && 'h-full',
                hasImage && 'grid grid-cols-1 grid-rows-[10rem_auto] items-stretch md:grid-rows-[11rem_auto]',
                !isTopLevel &&
                    'group/sub-link -mx-header-sublink-x rounded-header-sublink px-header-sublink-x py-header-sublink-y transition-colors duration-[var(--header-motion-fast)] ease-[var(--header-easing)] hover:bg-[var(--header-sublink-hover-bg)] focus-visible:bg-[var(--header-sublink-hover-bg)] focus-visible:outline-2 focus-visible:outline-primary/40',
            )}
        >
            {imageHeader}
            {labelBlock}
        </Link>
    ) : (
        // No link: render the label as a non-interactive heading so an
        // editor can use a label-only item as a group header. Children
        // (if any) still recurse below.
        <div role={isTopLevel ? undefined : 'presentation'} className={cn(!isTopLevel && 'px-0')}>
            {imageHeader}
            {labelBlock}
        </div>
    );

    const childList = hasChildren ? (
        <ul className={cn(isTopLevel ? 'border-black/[0.06] border-t px-3 py-3' : 'flex flex-col gap-0')}>
            {children.map((child, i) => (
                <li key={child.id ?? `mm-${depth + 1}-${i}`}>
                    <MegaMenuItem item={child} locale={locale} depth={depth + 1} />
                </li>
            ))}
        </ul>
    ) : null;

    return (
        <div
            className={cn(isTopLevel && PANEL_TILE_STYLES, isTopLevel && 'flex-col')}
            style={!hasImage && background ? { backgroundColor: background } : undefined}
        >
            {titleEl}
            {childList}
        </div>
    );
}

/** Legacy export kept as a no-op for source compat with old import paths. */
export function HeaderMenu() {
    return null;
}
HeaderMenu.displayName = 'Nordcom.Header.HeaderMenu';
