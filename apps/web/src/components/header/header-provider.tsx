'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';

import * as NProgress from 'nprogress';

export type HeaderProviderProps = {
    loaderColor: string;
};
export const HeaderProvider = ({ loaderColor }: HeaderProviderProps) => {
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
    // this should also trigger on searchParams changes but listening to it would cause
    // Next.js to deopt into client-side rendering. :(
    useEffect(() => {
        NProgress.done();

        document.body.removeAttribute('data-menu-open');
    }, [pathname, router]);

    return (
        <>
            <NextTopLoader color={loaderColor} showSpinner={true} crawl={true} />
        </>
    );
};
