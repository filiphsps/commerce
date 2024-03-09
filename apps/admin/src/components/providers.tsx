'use client';

import { GoogleTagManager } from '@next/third-parties/google';
import { Theme } from '@nordcom/commerce-marketing-common';
import { NordstarProvider } from '@nordcom/nordstar';
import { SessionProvider } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

import type { Session } from 'next-auth';
import type { ReactNode } from 'react';

export type ProvidersProps = {
    children: ReactNode;
    session: Session | null;
};
export function Providers({ children, session }: ProvidersProps) {
    const pathname = usePathname();
    const router = useRouter();

    // https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
    // this should also trigger on searchParams changes but listening to it would cause
    // Next.js to de-opt into client-side rendering. :(
    useEffect(() => {
        NProgress.done();
    }, [pathname, router]);

    return (
        <SessionProvider session={session} basePath="/admin/api/auth">
            <NordstarProvider theme={Theme}>
                <Toaster theme="dark" />
                <NextTopLoader color={Theme.accents.primary} showSpinner={true} crawl={true} />

                {children}

                <GoogleTagManager gtmId={'GTM-N6TLG8MX'} />
            </NordstarProvider>
        </SessionProvider>
    );
}
