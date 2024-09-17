import { Shop } from '@nordcom/commerce-db';

import { getAuthSession } from '@/auth';
import { SessionProvider } from 'next-auth/react';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type LayoutParams = { domain: string; locale: string };

export const metadata: Metadata = {
    robots: {
        index: false
    },
    openGraph: null
};

export default async function AccountLayout({
    children,
    params: { domain }
}: {
    children: ReactNode;
    params: LayoutParams;
}) {
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    const { auth } = await getAuthSession(shop);
    const session = await auth();

    return <SessionProvider session={session}>{children}</SessionProvider>;
}
