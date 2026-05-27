'use client';

import { GoogleTagManager } from '@next/third-parties/google';

import { Theme } from '@nordcom/commerce-marketing-common';
import { NordstarProvider } from '@nordcom/nordstar';
import { usePathname } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import type { ReactNode } from 'react';
import { Suspense, useEffect } from 'react';
import { Toaster } from 'sonner';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

/**
 * Signals NProgress completion on every client-side route change.
 *
 * Isolated so that the `usePathname()` subscription does not force the parent
 * `<Providers>` tree to opt out of prerender under Next 16's `cacheComponents: true`.
 *
 * @see https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
 */
function CompleteProgressOnRouteChange() {
    const pathname = usePathname();
    useEffect(() => {
        NProgress.done();
        void pathname;
    }, [pathname]);
    return null;
}

export type ProvidersProps = {
    children: ReactNode;
};
/**
 * Wraps the application with the Nordstar theme provider, top-loader, toast notifications, and Google Tag Manager.
 *
 * @param props.children - The application subtree to wrap.
 */
export function Providers({ children }: ProvidersProps) {
    return (
        <NordstarProvider theme={Theme} className="block">
            <Toaster theme="dark" />
            <NextTopLoader color={Theme.accents.primary} showSpinner={true} crawl={true} />

            <Suspense fallback={null}>
                <CompleteProgressOnRouteChange />
            </Suspense>

            <Suspense fallback={null}>{children}</Suspense>

            {GTM_ID ? <GoogleTagManager gtmId={GTM_ID} /> : null}
        </NordstarProvider>
    );
}
