'use client';

import { MissingContextProviderError } from '@nordcom/commerce-errors';
import { usePathname } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

const SCROLL_THRESHOLD = 35;

export type HeaderContextReturns = {};
export type HeaderProviderBase = {
    menu: string | null;
    setMenu: (id: string) => void;
    closeMenu: () => void;
};
export interface HeaderContextValue extends HeaderProviderBase, HeaderContextReturns {}

export const HeaderContext = createContext<HeaderContextValue | null>(null);

export type HeaderProviderProps = {
    children?: ReactNode;
    loaderColor?: string;
};
export const HeaderProvider = ({ children = null, loaderColor }: HeaderProviderProps) => {
    const pathname = usePathname();

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

    // Stop the loader on page navigation and close the menu.
    useEffect(() => {
        // https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
        // this should also trigger on searchParams changes but listening to it would cause
        // Next.js to deopt into client-side rendering. :(
        NProgress.done();

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

export const useHeaderMenu = (): HeaderContextValue => {
    const context = useContext(HeaderContext);
    if (!context) {
        throw new MissingContextProviderError('useHeaderMenu', 'HeaderProvider');
    }

    return context;
};
