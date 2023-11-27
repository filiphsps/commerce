'use client';

import { ModalProvider } from '#/components/modal/provider';
import { NordstarProvider } from '@nordcom/nordstar';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

export type ProvidersProps = {
    children: ReactNode;
};
export function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            <NordstarProvider>
                <Toaster theme="dark" />
                <ModalProvider>{children}</ModalProvider>
            </NordstarProvider>
        </SessionProvider>
    );
}
