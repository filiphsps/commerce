'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { MissingContextProviderError } from '@nordcom/commerce-errors';

import { usePathname, useRouter } from 'next/navigation';

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
    const router = useRouter();

    const [menu, setMenu] = useState<boolean>(false);

    // Deal with showing shadow when the menu is open.
    useEffect(() => {
        document.body.setAttribute('data-menu-open', menu.toString());
    }, [, menu]);

    // Stop the loader on page navigation and close the menu.
    useEffect(() => {
        document.body.removeAttribute('data-menu-open');
        setMenu(false);
    }, [pathname, router]);

    const value = { menu, setMenu, closeMenu: () => setMenu(false) };
    return <HeaderContext.Provider value={value}>{children as any}</HeaderContext.Provider>;
};

export const useHeaderMenu = (): HeaderContextValue => {
    const context = useContext(HeaderContext);
    if (!context) {
        throw new MissingContextProviderError('useHeaderMenu', 'HeaderProvider');
    }

    return context;
};
