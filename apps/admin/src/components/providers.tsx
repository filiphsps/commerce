'use client';

import { GoogleTagManager } from '@next/third-parties/google';

import { Theme } from '@nordcom/commerce-marketing-common';
import { NordstarProvider } from '@nordcom/nordstar';
import { usePathname, useRouter } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { HeaderProvider } from '@/components/header-provider';

export type ProvidersProps = {
    children: ReactNode;
};
export function Providers({ children }: ProvidersProps) {
    const _pathname = usePathname();
    const _router = useRouter();

    // https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
    // this should also trigger on searchParams changes but listening to it would cause
    // Next.js to de-opt into client-side rendering. :(
    useEffect(() => {
        NProgress.done();
    }, []);

    return (
        <NordstarProvider theme={Theme}>
            <Toaster theme="dark" />
            <NextTopLoader color={Theme.accents.primary} showSpinner={true} crawl={true} />

            <HeaderProvider>{children}</HeaderProvider>

            <GoogleTagManager gtmId={'GTM-N6TLG8MX'} />
        </NordstarProvider>
    );
}
