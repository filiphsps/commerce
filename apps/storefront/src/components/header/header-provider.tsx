'use client';

import { MissingContextProviderError } from '@nordcom/commerce-errors';
import { usePathname, useSearchParams } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import type { ReactNode } from 'react';
import { createContext, Suspense, useContext, useEffect, useState } from 'react';

const SCROLL_THRESHOLD = 35;

export type HeaderContextReturns = {};
export type HeaderProviderBase = {
    menu: string | null;
    setMenu: (id: string) => void;
    closeMenu: () => void;
};
export interface HeaderContextValue extends HeaderProviderBase, HeaderContextReturns {}

export const HeaderContext = createContext<HeaderContextValue | null>(null);

const NOOP_HEADER_VALUE: HeaderContextValue = {
    menu: null,
    setMenu: () => {},
    closeMenu: () => {},
};

export type HeaderProviderProps = {
    children?: ReactNode;
    loaderColor?: string;
};

// `usePathname` (and `NextTopLoader`'s internal route tracking) are considered
// uncached data under `cacheComponents`. Without a Suspense boundary they
// block the route from prerendering — the layout's `HeaderProvider` is also
// reached as the fallback of upstream Suspense boundaries (e.g. `Trackable`),
// so its uncached reads must not block the fallback path. Render children
// with a noop context during prerender; the real provider takes over after
// hydration.
/**
 * Top-level provider wrapping the header context in a Suspense boundary to prevent prerender blocking.
 *
 * @param props.children - Subtree that consumes `HeaderContext`.
 * @param props.loaderColor - Primary color forwarded to the `NextTopLoader` progress bar.
 * @returns The Suspense-wrapped header context provider.
 */
export const HeaderProvider = ({ children, loaderColor }: HeaderProviderProps) => {
    return (
        <Suspense fallback={<HeaderContext.Provider value={NOOP_HEADER_VALUE}>{children}</HeaderContext.Provider>}>
            <HeaderProviderInner loaderColor={loaderColor}>{children}</HeaderProviderInner>
        </Suspense>
    );
};

/**
 * Inner provider that tracks scroll position, resets menu state on route change, and mounts the route-progress loader.
 *
 * @param props.children - Subtree that consumes `HeaderContext`.
 * @param props.loaderColor - Primary color forwarded to `NextTopLoader`.
 * @returns The context provider element with children and top-loader.
 */
const HeaderProviderInner = ({ children, loaderColor }: HeaderProviderProps) => {
    const pathname = usePathname();
    const _searchParams = useSearchParams();

    // Deal with scrolling and setting the scrolled attribute.
    useEffect(() => {
        const scrolled = Math.floor(window.scrollY) >= SCROLL_THRESHOLD;
        document.body.setAttribute('data-scrolled', scrolled ? 'true' : 'false');

        const onScroll = () => {
            const scroll = Math.floor(window.scrollY);
            // document.body.style.setProperty('--scroll-y', `${scroll}px`);

            const scrolled = scroll >= SCROLL_THRESHOLD ? 'true' : 'false';
            if (document.body.getAttribute('data-scrolled') !== scrolled)
                document.body.setAttribute('data-scrolled', scrolled);
        };
        window.addEventListener('scroll', onScroll);
        return () => {
            try {
                window.removeEventListener('scroll', onScroll);
            } catch {}
        };
    }, []);

    const [menu, setMenu] = useState<string | null>(null);
    const [lastPathname, setLastPathname] = useState(pathname);

    // Reset menu state when navigating to a new page.
    let menuValue = menu;
    if (pathname !== lastPathname) {
        setLastPathname(pathname);
        setMenu(null);
        menuValue = null;
    }

    // Deal with showing shadow when the menu is open.
    useEffect(() => {
        document.body.setAttribute('data-menu-open', menuValue !== null ? 'true' : 'false');
    }, [menuValue]);

    // URL transition cleanup. Fires on both pathname AND searchParams change.
    useEffect(() => {
        document.body.removeAttribute('data-menu-open');
    }, []);

    const value = { menu: menuValue, setMenu, closeMenu: () => setMenu(null) };
    return (
        <HeaderContext.Provider value={value}>
            {children}

            <NextTopLoader color={loaderColor} height={8} showSpinner={true} crawl={true} zIndex={9999} />
        </HeaderContext.Provider>
    );
};

/**
 * Returns the current header menu context value.
 *
 * @throws {MissingContextProviderError} When called outside a `HeaderProvider`.
 * @returns The `HeaderContextValue` from the nearest provider.
 */
export const useHeaderMenu = (): HeaderContextValue => {
    const context = useContext(HeaderContext);
    if (!context) {
        throw new MissingContextProviderError('useHeaderMenu', 'HeaderProvider');
    }

    return context;
};
