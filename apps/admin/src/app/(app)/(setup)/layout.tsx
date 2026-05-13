import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';
import { auth } from '@/auth';

export default async function SetupLayout({ children }: { children: ReactNode }) {
    const session = await auth();

    return <SessionProvider session={session}>{children}</SessionProvider>;
}
