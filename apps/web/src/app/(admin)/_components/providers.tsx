'use client';

import { ModalProvider } from '#/components/modal/provider';
import { NordstarProvider } from '@nordcom/nordstar';
import { SessionProvider } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'sonner';

export type ProvidersProps = {
    children: ReactNode;
};
export function Providers({ children }: ProvidersProps) {
    const pathname = usePathname();
    const router = useRouter();

    // https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
    // this should also trigger on searchParams changes but listening to it would cause
    // Next.js to deopt into client-side rendering. :(
    useEffect(() => {
        NProgress.done();
    }, [pathname, router]);

    return (
        <SessionProvider>
            <NordstarProvider>
                <Toaster theme="dark" />
                <NextTopLoader color={'#ed1e79'} showSpinner={true} crawl={true} />
                <ModalProvider>{children}</ModalProvider>
            </NordstarProvider>
        </SessionProvider>
    );
}
