'use client';

import { resolveLink } from '@nordcom/commerce-cms/api';
import type { Header, Media } from '@nordcom/commerce-cms/types';
import { ChevronDown as ChevronDownIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';
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

    const scrollTriggerIntoView = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        el.scrollIntoView({ block: 'nearest', inline: 'start', behavior: 'smooth' });
    }, []);

    const wasOpenRef = useRef(false);
    useEffect(() => {
        if (open && !wasOpenRef.current) scrollTriggerIntoView();
        wasOpenRef.current = open;
    }, [open, scrollTriggerIntoView]);

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
            className="inline-block snap-start"
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
                            'after:pointer-events-none after:absolute after:right-2 after:bottom-0 after:left-2 after:h-[var(--header-rail-thickness)] after:rounded-[1px] after:bg-primary after:content-[""]',
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

type Variant = 'editorial-columns' | 'compact-list' | 'featured-promo';

const KNOWN_VARIANTS: ReadonlySet<Variant> = new Set(['editorial-columns', 'compact-list', 'featured-promo']);

const resolveVariant = (raw: unknown): Variant => {
    if (typeof raw === 'string' && KNOWN_VARIANTS.has(raw as Variant)) return raw as Variant;
    if (raw != null && process.env.NODE_ENV !== 'production') {
        console.warn(`[header-menu] unknown variant "${String(raw)}" — falling back to editorial-columns`);
    }
    return 'editorial-columns';
};

function MegaMenuPanel({ item, locale }: { item: NavItem; locale: { code: string } }) {
    const variant = resolveVariant((item as { variant?: string }).variant);
    return (
        <div data-header-variant={variant}>
            {variant === 'editorial-columns' && <EditorialColumnsPanel item={item} locale={locale} />}
            {variant === 'compact-list' && <CompactListPanel item={item} locale={locale} />}
            {variant === 'featured-promo' && <FeaturedPromoPanel item={item} locale={locale} />}
        </div>
    );
}

function EditorialColumnsPanel({ item, locale }: { item: NavItem; locale: { code: string } }) {
    const items = (item.items ?? []) as RecursiveNavItem[];
    if (items.length === 0) return null;

    if (items.length === 1) {
        return (
            <div data-header-editorial-single="true" className="mx-auto w-full max-w-[clamp(280px,50%,480px)]">
                <EditorialColumn item={items[0]!} locale={locale} index={0} />
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex flex-col gap-y-header-column-y',
                'md:grid md:gap-x-header-column-x md:gap-y-header-column-y',
                'md:grid-cols-[repeat(auto-fit,minmax(clamp(180px,22%,240px),1fr))]',
            )}
        >
            {items.map((child, i) => (
                <EditorialColumn key={child.id ?? `mm-1-${i}`} item={child} locale={locale} index={i} />
            ))}
        </div>
    );
}

function EditorialColumn({ item, locale, index }: { item: RecursiveNavItem; locale: { code: string }; index: number }) {
    const link = item.link;
    const label = link?.label ?? null;
    const href = link ? (resolveLink(link as never, { locale: { code: locale.code } }) ?? null) : null;
    const image = isPopulatedMedia(item.image) ? item.image : null;
    const description = item.description?.trim() || null;
    const children = (item.items ?? []) as RecursiveNavItem[];

    if (!label && children.length === 0) return null;

    const eyebrowClass =
        'text-[0.78rem] uppercase tracking-[var(--header-eyebrow-tracking)] font-semibold text-primary leading-none';

    const eyebrow = label ? (
        href ? (
            <Link
                href={href}
                target={link?.openInNewTab ? '_blank' : undefined}
                role="menuitem"
                data-header-editorial-eyebrow="true"
                className={cn(
                    eyebrowClass,
                    'transition-colors duration-[var(--header-motion-fast)] ease-[var(--header-easing)] hover:text-primary-dark focus-visible:text-primary-dark focus-visible:outline-2 focus-visible:outline-primary/40',
                )}
            >
                {label}
            </Link>
        ) : (
            <div data-header-editorial-eyebrow="true" className={eyebrowClass}>
                {label}
            </div>
        )
    ) : null;

    return (
        <div
            data-header-editorial-column
            className="flex animate-mega-menu-column flex-col gap-1.5 max-md:border-[var(--header-divider-color)] max-md:border-t max-md:pt-header-column-y first:max-md:border-t-0 first:max-md:pt-0"
            style={{ animationDelay: `calc(var(--header-stagger-step) * ${Math.min(index, 5)})` }}
        >
            {image?.url ? (
                <div className="mb-3 overflow-hidden rounded-[calc(var(--header-panel-radius)*0.66)]">
                    <Image
                        src={image.url}
                        alt={image.alt ?? label ?? ''}
                        width={image.width ?? 320}
                        height={image.height ?? 200}
                        className="aspect-[16/10] w-full object-cover transition-transform duration-[var(--header-motion-slow)] ease-[var(--header-easing-expo)] hover:scale-[1.02]"
                        sizes="(max-width: 768px) 90vw, 240px"
                        draggable={false}
                        loading="lazy"
                        decoding="async"
                    />
                </div>
            ) : null}
            {eyebrow}
            {description ? <p className="text-gray-600 text-sm leading-snug">{description}</p> : null}
            {children.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-[2px]">
                    {children.map((child, i) => (
                        <li key={child.id ?? `ed-sub-${i}`}>
                            <EditorialSublink item={child} locale={locale} />
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

function EditorialSublink({
    item,
    locale,
    size = 'default',
}: {
    item: RecursiveNavItem;
    locale: { code: string };
    size?: 'default' | 'prominent';
}) {
    const link = item.link;
    const label = link?.label ?? null;
    const href = link ? (resolveLink(link as never, { locale: { code: locale.code } }) ?? null) : null;
    if (!label) return null;

    const sizeClass =
        size === 'prominent'
            ? 'text-[0.95rem] py-[calc(var(--header-sublink-pad-y)*1.25)]'
            : 'text-[0.92rem] py-header-sublink-y';

    const className = cn(
        'block rounded-header-sublink px-header-sublink-x -mx-header-sublink-x text-gray-800',
        sizeClass,
        'transition-colors duration-[var(--header-motion-fast)] ease-[var(--header-easing)]',
        'hover:bg-[var(--header-sublink-hover-bg)] hover:text-primary',
        'focus-visible:bg-[var(--header-sublink-hover-bg)] focus-visible:outline-2 focus-visible:outline-primary/40',
    );

    return href ? (
        <Link href={href} target={link?.openInNewTab ? '_blank' : undefined} role="menuitem" className={className}>
            {label}
        </Link>
    ) : (
        <span className={className}>{label}</span>
    );
}

function CompactListPanel({ item, locale }: { item: NavItem; locale: { code: string } }) {
    const items = (item.items ?? []) as RecursiveNavItem[];
    if (items.length === 0) return null;
    return (
        <div data-header-compact-list className="mx-auto max-w-[480px]">
            <ul className="flex flex-col gap-[2px]">
                {items.map((child, i) => (
                    <li key={child.id ?? `cl-${i}`}>
                        <CompactListItem item={child} locale={locale} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function CompactListItem({ item, locale }: { item: RecursiveNavItem; locale: { code: string } }) {
    const link = item.link;
    const label = link?.label ?? null;
    const href = link ? (resolveLink(link as never, { locale: { code: locale.code } }) ?? null) : null;
    if (!label) return null;

    const className = cn(
        'block rounded-header-sublink px-3 py-2 -mx-3 text-[0.95rem] text-gray-800',
        'transition-colors duration-[var(--header-motion-fast)] ease-[var(--header-easing)]',
        'hover:bg-[var(--header-sublink-hover-bg)] hover:text-primary',
        'focus-visible:bg-[var(--header-sublink-hover-bg)] focus-visible:outline-2 focus-visible:outline-primary/40',
    );

    return href ? (
        <Link href={href} target={link?.openInNewTab ? '_blank' : undefined} role="menuitem" className={className}>
            {label}
        </Link>
    ) : (
        <span className={className}>{label}</span>
    );
}

function FeaturedPromoPanel({ item, locale }: { item: NavItem; locale: { code: string } }) {
    const items = (item.items ?? []) as RecursiveNavItem[];
    if (items.length === 0) return null;
    const [hero, ...rest] = items;

    if (rest.length === 0) {
        return (
            <div className="mx-auto w-full max-w-[min(100%,calc(var(--page-width,1536px)*0.5))]">
                {hero ? <FeaturedHero item={hero} locale={locale} /> : null}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-header-column-y md:grid md:grid-cols-[3fr_2fr] md:gap-x-header-column-x">
            {hero ? <FeaturedHero item={hero} locale={locale} /> : null}
            <ul data-header-featured-list className="flex flex-col gap-[2px]">
                {rest.map((child, i) => (
                    <li
                        key={child.id ?? `fp-${i}`}
                        className="animate-mega-menu-column"
                        style={{ animationDelay: `calc(var(--header-stagger-step) * ${Math.min(i, 5)})` }}
                    >
                        <EditorialSublink item={child} locale={locale} size="prominent" />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function FeaturedHero({ item, locale }: { item: RecursiveNavItem; locale: { code: string } }) {
    const link = item.link;
    const label = link?.label ?? null;
    const href = link ? (resolveLink(link as never, { locale: { code: locale.code } }) ?? null) : null;
    const image = isPopulatedMedia(item.image) ? item.image : null;
    const description = item.description?.trim() || null;
    const background = item.backgroundColor || undefined;
    const eyebrowClass =
        'text-[0.78rem] uppercase tracking-[var(--header-eyebrow-tracking)] font-semibold text-primary leading-none';

    const visual = image?.url ? (
        <div className="overflow-hidden rounded-[calc(var(--header-panel-radius)*0.8)]">
            <Image
                src={image.url}
                alt={image.alt ?? label ?? ''}
                width={image.width ?? 640}
                height={image.height ?? 480}
                className="aspect-[4/3] max-h-[280px] w-full object-cover transition-transform duration-[var(--header-motion-slow)] ease-[var(--header-easing-expo)] hover:scale-[1.02]"
                sizes="(max-width: 768px) 90vw, 480px"
                draggable={false}
                loading="lazy"
                decoding="async"
            />
        </div>
    ) : (
        <div
            data-header-featured-hero-fallback="true"
            className="aspect-[4/3] max-h-[280px] w-full rounded-[calc(var(--header-panel-radius)*0.8)] bg-gray-50"
            style={background ? { backgroundColor: background } : undefined}
        />
    );

    const inner = (
        <>
            {visual}
            {label ? <div className={cn(eyebrowClass, 'mt-3')}>{label}</div> : null}
            {label ? (
                <h3 className="mt-1.5 font-semibold text-[1.5rem] text-gray-900 leading-tight tracking-tight">
                    {label}
                </h3>
            ) : null}
            {description ? <p className="mt-1.5 text-gray-600 text-sm leading-snug">{description}</p> : null}
            {label ? (
                <span className="mt-3 inline-flex items-center gap-1 font-semibold text-primary text-sm">
                    {label}
                    <ChevronRightIcon
                        aria-hidden={true}
                        className="size-3.5 stroke-2 transition-transform duration-[var(--header-motion-base)] ease-[var(--header-easing-expo)] group-hover/featured:translate-x-0.5"
                    />
                </span>
            ) : null}
        </>
    );

    return href ? (
        <Link
            href={href}
            target={link?.openInNewTab ? '_blank' : undefined}
            role="menuitem"
            data-header-featured-hero="true"
            className="group/featured block focus-visible:outline-2 focus-visible:outline-primary/40"
        >
            {inner}
        </Link>
    ) : (
        <div data-header-featured-hero="true" className="group/featured block">
            {inner}
        </div>
    );
}

/** Legacy export kept as a no-op for source compat with old import paths. */
export function HeaderMenu() {
    return null;
}
HeaderMenu.displayName = 'Nordcom.Header.HeaderMenu';
