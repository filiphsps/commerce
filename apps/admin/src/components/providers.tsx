'use client';

import { GoogleTagManager } from '@next/third-parties/google';
import { NordstarProvider } from '@nordcom/nordstar';
import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import { useEffect, type ReactNode } from 'react';
import { Toaster } from 'sonner';

// TODO: This should be shared between `landing` and `admin`.
const theme = {
    accents: {
        primary: '#ed1e79',
        secondary: '#ed1e79'
    },
    fonts: {
        heading: 'var(--font-primary)',
        body: 'var(--font-primary)'
    }
};

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
            <NordstarProvider theme={theme}>
                <Toaster theme="dark" />
                <NextTopLoader color={theme.accents.primary} showSpinner={true} crawl={true} />

                {children}

                <GoogleTagManager gtmId={'GTM-N6TLG8MX'} />
            </NordstarProvider>
        </SessionProvider>
    );
}
