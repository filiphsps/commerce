'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { MissingContextProviderError } from '@nordcom/commerce-errors';

import { usePathname } from 'next/navigation';

import type { ReactNode } from 'react';

export type HeaderContextReturns = {};
export type HeaderProviderBase = {
    menu: boolean;
    setMenu: (open: boolean) => void;
    closeMenu: () => void;
};
export interface HeaderContextValue extends HeaderProviderBase, HeaderContextReturns {}

export const HeaderContext = createContext<HeaderContextValue | null>(null);

export type HeaderProviderProps = {
    children?: ReactNode;
};
export const HeaderProvider = ({ children = null }: HeaderProviderProps) => {
    const pathname = usePathname();

    const [menu, setMenu] = useState<boolean>(false);
    const [lastPathname, setLastPathname] = useState(pathname);

    // Reset menu state when navigating between pages.
    let menuValue = menu;
    if (pathname !== lastPathname) {
        setLastPathname(pathname);
        setMenu(false);
        menuValue = false;
    }

    // Deal with showing shadow when the menu is open.
    useEffect(() => {
        document.body.setAttribute('data-menu-open', menuValue.toString());
    }, [menuValue]);

    // Clean up the menu attribute on navigation.
    useEffect(() => {
        document.body.removeAttribute('data-menu-open');
    }, [pathname]);

    const value = { menu: menuValue, setMenu, closeMenu: () => setMenu(false) };
    return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
};

export const useHeaderMenu = (): HeaderContextValue => {
    const context = useContext(HeaderContext);
    if (!context) {
        throw new MissingContextProviderError('useHeaderMenu', 'HeaderProvider');
    }

    return context;
};
