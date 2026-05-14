'use client';

import { GoogleTagManager } from '@next/third-parties/google';

import { Theme } from '@nordcom/commerce-marketing-common';
import { NordstarProvider } from '@nordcom/nordstar';
import { usePathname } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

// Don't bake the prod GTM container into the bundle — every preview build
// would otherwise fire analytics into the production container, polluting
// metrics and triggering tags on dev/preview traffic. Drive it from env so
// preview deploys can be set to empty (or a staging container).
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export type ProvidersProps = {
    children: ReactNode;
};
export function Providers({ children }: ProvidersProps) {
    const pathname = usePathname();

    // https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
    // this should also trigger on searchParams changes but listening to it would cause
    // Next.js to de-opt into client-side rendering. :(
    useEffect(() => {
        NProgress.done();

        void pathname;
    }, [pathname]);

    return (
        <NordstarProvider theme={Theme} className="block">
            <Toaster theme="dark" />
            <NextTopLoader color={Theme.accents.primary} showSpinner={true} crawl={true} />

            {children}

            {GTM_ID ? <GoogleTagManager gtmId={GTM_ID} /> : null}
        </NordstarProvider>
    );
}
