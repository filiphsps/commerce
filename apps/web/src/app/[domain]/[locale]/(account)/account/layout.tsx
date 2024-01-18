import { getAuthOptions } from '@/auth';
import { Locale } from '@/utils/locale';
import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';
import { getServerSession, type Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

// Make sure this page is always dynamic.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export type LayoutParams = { domain: string; locale: string };

export default async function AccountLayout({
    children,
    params: { domain, locale: localeData }
}: {
    children: ReactNode;
    params: LayoutParams;
}) {
    try {
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const shop = await ShopApi(domain, cache);

        let session: Session | null = null;
        try {
            session = await getServerSession(await getAuthOptions({ shop }));
        } catch (error) {
            console.error(error);
        }

        return <SessionProvider session={session}>{children}</SessionProvider>;
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
