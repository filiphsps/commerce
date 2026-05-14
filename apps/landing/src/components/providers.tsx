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

// https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
// Isolated in its own component (and Suspense-wrapped below) so the dynamic
// usePathname() read doesn't force <Providers> itself to opt out of prerender
// under Next 16's cacheComponents:true.
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
