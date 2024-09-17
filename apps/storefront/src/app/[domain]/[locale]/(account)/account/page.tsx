import { Shop } from '@nordcom/commerce-db';

import { getAuthSession } from '@/auth';
import { Locale } from '@/utils/locale';

import { Label } from '@/components/typography/label';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type LayoutParams = { domain: string; locale: string };

export async function generateMetadata({}: { params: LayoutParams }): Promise<Metadata> {
    return {
        title: 'Account Dashboard'
    };
}

export default async function AccountPage({ params: { domain, locale: localeData } }: { params: LayoutParams }) {
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const { auth } = await getAuthSession(shop);

    const session = await auth();
    if (!session?.user) {
        redirect('/account/login');
    }

    const _locale = Locale.from(localeData);
    const user = session.user;

    return (
        <div>
            <h1>TODO: Logged in!</h1>

            <Label as="div">{user.id}</Label>
            <Label as="div">{user.name}</Label>
            <Label as="div">{user.image}</Label>
            <Label as="div">{user.email}</Label>
        </div>
    );
}
