'use client';

import type { StoreModel } from '@/models/StoreModel';
import { usePathname, useRouter } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import { useEffect, type ReactNode } from 'react';

type HeaderProviderProps = {
    children: ReactNode;
    store: StoreModel;
};
export const HeaderProvider = ({ children, store }: HeaderProviderProps) => {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const threshold = 5;
        document.body.setAttribute('data-scrolled', Math.floor(window.scrollY) >= threshold ? 'true' : 'false');

        const onScroll = () => {
            const scroll = Math.floor(window.scrollY);

            // document.body.style.setProperty('--scroll-y', `${scroll}px`);

            const scrolled = scroll >= threshold ? 'true' : 'false';
            if (document.body.getAttribute('data-scrolled') !== scrolled)
                document.body.setAttribute('data-scrolled', scrolled);
        };
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
    useEffect(() => {
        NProgress.done();
    }, [pathname, router]);

    return (
        <>
            <NextTopLoader color={store.accent.primary} showSpinner={true} crawl={true} />
            {children}
        </>
    );
};
