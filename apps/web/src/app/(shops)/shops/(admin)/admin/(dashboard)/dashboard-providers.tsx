'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export default function DashboardProviders({ children, session }: { children: ReactNode; session: Session | null }) {
    return <SessionProvider session={session}>{children}</SessionProvider>;
}
