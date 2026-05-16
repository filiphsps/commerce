'use client';

import { ModalContainer, ModalProvider } from '@faceless-ui/modal';
import { GoogleTagManager } from '@next/third-parties/google';

import { Theme } from '@nordcom/commerce-marketing-common';
import { NordstarProvider } from '@nordcom/nordstar';
import NextTopLoader from 'nextjs-toploader';
import * as NProgress from 'nprogress';
import type { ReactNode } from 'react';
import { Suspense, useEffect } from 'react';
import { Toaster } from 'sonner';
import { HeaderProvider } from '@/components/header-provider';

export type ProvidersProps = {
    children: ReactNode;
};
export function Providers({ children }: ProvidersProps) {
    // https://github.com/TheSGJ/nextjs-toploader/issues/56#issuecomment-1820484781
    // this should also trigger on searchParams changes but listening to it would cause
    // Next.js to de-opt into client-side rendering. :(
    useEffect(() => {
        NProgress.done();
    }, []);

    return (
        <NordstarProvider theme={Theme}>
            <Toaster theme="dark" />

            {/* `NextTopLoader`, `HeaderProvider`, and `GoogleTagManager` all read */}
            {/* `usePathname()` internally — dynamic access must sit inside a */}
            {/* Suspense boundary under `cacheComponents`. */}
            <Suspense fallback={null}>
                <NextTopLoader color={Theme.accents.primary} showSpinner={true} crawl={true} />

                {/* Global `@faceless-ui/modal` context. Defense-in-depth so any
                 *  `@payloadcms/ui` component that mounts a document drawer
                 *  (upload/relationship fields, lexical upload nodes, …) has
                 *  `modalState` defined even outside `<PayloadFieldShell>`.
                 *  Without this fallback, `useDocumentDrawer` blows up with
                 *  `m is undefined` on the first paint of any media upload
                 *  field — the optional chain inside Payload's hook only
                 *  guards `.isOpen`, not the parent subscript access. */}
                <ModalProvider classPrefix="payload" transTime={0} zIndex={9999}>
                    <HeaderProvider>{children}</HeaderProvider>
                    <ModalContainer />
                </ModalProvider>

                <GoogleTagManager gtmId={'GTM-N6TLG8MX'} />
            </Suspense>
        </NordstarProvider>
    );
}
