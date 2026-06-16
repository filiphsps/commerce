'use client';

import { GoogleTagManager } from '@next/third-parties/google';

import { Theme } from '@nordcom/commerce-marketing-common';
import { NordstarProvider } from '@nordcom/nordstar';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import type { ReactNode } from 'react';
import { Suspense, useEffect } from 'react';
import { Toaster } from 'sonner';
import { AdminBuildNotifier } from '@/components/build-notifier/build-notifier';

export type ProvidersProps = {
    children: ReactNode;
};
/**
 * Root client provider tree for the admin shell.
 *
 * Mounts NordstarProvider, NextTopLoader, Toaster, Google Tag Manager, and AdminBuildNotifier.
 *
 * @param props.children - Application tree wrapped by all providers.
 */
export function Providers({ children }: ProvidersProps) {
    // https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
    // this should also trigger on searchParams changes but listening to it would cause
    // Next.js to de-opt into client-side rendering. :(
    useEffect(() => {
        NProgress.done();
    }, []);

    return (
        <NordstarProvider theme={Theme}>
            <div>
                <Suspense fallback={null}>
                    <NextTopLoader color={Theme.accents.primary} showSpinner={true} crawl={true} />
                    <Toaster theme="dark" />

                    {children}

                    <GoogleTagManager gtmId={'GTM-N6TLG8MX'} />
                    <AdminBuildNotifier />
                </Suspense>
            </div>
        </NordstarProvider>
    );
}
