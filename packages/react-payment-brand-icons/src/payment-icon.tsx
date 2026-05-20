import { type ComponentType, type LazyExoticComponent, lazy, type ReactNode } from 'react';

import { ALIASES } from './generated/aliases';
import { ICONS } from './generated/icons-map';
import type { PaymentIconNameOrAlias } from './generated/names';
import type { PaymentIconProps } from './shell';

export type PaymentIconWrapperProps = PaymentIconProps & {
    name: PaymentIconNameOrAlias | (string & Record<never, never>);
    fallback?: ReactNode;
};

const DEFAULT_FALLBACK = <span aria-hidden style={{ display: 'inline-block', width: 38, height: 24 }} />;

let unknownWarned = new Set<string>();

function warnOnce(name: string): void {
    if (process.env.NODE_ENV === 'production') return;
    if (unknownWarned.has(name)) return;
    unknownWarned.add(name);
    console.warn(`[react-payment-brand-icons] no icon registered for name "${name}".`);
}

function resolveSlug(name: string): string | undefined {
    if (name in ICONS) return name;
    if (name in ALIASES) return ALIASES[name];
    return undefined;
}

// Per-slug lazy component cache so React.lazy is called at most once per slug.
const lazyCache = new Map<string, LazyExoticComponent<ComponentType<PaymentIconProps>>>();

function getLazyIcon(slug: string): LazyExoticComponent<ComponentType<PaymentIconProps>> {
    const cached = lazyCache.get(slug);
    if (cached) return cached;
    const loader = ICONS[slug]!;
    const LazyIcon = lazy(loader);
    lazyCache.set(slug, LazyIcon);
    return LazyIcon;
}

/**
 * `<PaymentIcon name>` — lazily loads and renders the matching payment brand SVG.
 * Accepts a canonical slug or registered alias. Suspends while the icon chunk loads.
 * Falls back to `fallback` (or a blank placeholder) when the name is unknown.
 */
export function PaymentIcon({ name, fallback, ...props }: PaymentIconWrapperProps) {
    const slug = resolveSlug(name);
    if (!slug) {
        warnOnce(name);
        return <>{fallback ?? DEFAULT_FALLBACK}</>;
    }
    const LazyIcon = getLazyIcon(slug);
    return <LazyIcon {...props} />;
}

// Test-only reset hook for the warn-once cache.
export function __resetUnknownWarned(): void {
    unknownWarned = new Set();
}
