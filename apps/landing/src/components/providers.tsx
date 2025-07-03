'use client';

import { useEffect } from 'react';

import { Theme } from '@nordcom/commerce-marketing-common';
import { NordstarProvider } from '@nordcom/nordstar';

import { GoogleTagManager } from '@next/third-parties/google';
import { usePathname, useRouter } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import { Toaster } from 'sonner';

import type { ReactNode } from 'react';

export type ProvidersProps = {
    children: ReactNode;
};
export function Providers({ children }: ProvidersProps) {
    const pathname = usePathname();
    const router = useRouter();

    // https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
    // this should also trigger on searchParams changes but listening to it would cause
    // Next.js to de-opt into client-side rendering. :(
    useEffect(() => {
        NProgress.done();
    }, [pathname, router]);

    return (
        <NordstarProvider theme={Theme}>
            <Toaster theme="dark" />
            <NextTopLoader color={Theme.accents.primary} showSpinner={true} crawl={true} />

            {children as any}

            <GoogleTagManager gtmId={'GTM-N6TLG8MX'} />
        </NordstarProvider>
    );
}
