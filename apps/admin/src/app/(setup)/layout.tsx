import { auth } from '@/auth';
import { SessionProvider } from 'next-auth/react';

import type { ReactNode } from 'react';

export default async function SetupLayout({ children }: { children: ReactNode }) {
    const session = await auth();

    return <SessionProvider session={session}>{children}</SessionProvider>;
}