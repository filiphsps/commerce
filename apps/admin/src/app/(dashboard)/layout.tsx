import { SessionProvider } from 'next-auth/react';

import { auth } from '@/utils/auth';

import type { ReactNode } from 'react';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const session = await auth();

    return <SessionProvider session={session}>{children}</SessionProvider>;
}
