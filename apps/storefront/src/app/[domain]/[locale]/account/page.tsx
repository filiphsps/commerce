import { Shop } from '@nordcom/commerce-db';

import { getAuthSession } from '@/auth';
import { Locale } from '@/utils/locale';

import { Label } from '@/components/typography/label';

import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'auto';
export const revalidate = 0;

export type LayoutParams = { domain: string; locale: string };

export async function generateMetadata({}: { params: LayoutParams }): Promise<Metadata> {
    return {
        title: 'Account Dashboard'
    };
}

export default async function AccountPage({ params: { domain, locale: localeData } }: { params: LayoutParams }) {
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    const session = await getAuthSession(shop);
    if (!session) {
        return <div>TODO: Not logged in.</div>;
    }

    const _locale = Locale.from(localeData);
    const user = session.user;

    return (
        <div>
            <h1>TODO: Logged in!</h1>

            <Label as="div">{user?.id}</Label>
            <Label as="div">{user?.name}</Label>
            <Label as="div">{user?.email}</Label>
            {user?.image ? (
                <img
                    src={user.image}
                    alt={user.name || ''}
                    height={100}
                    width={100}
                    className="rounded-full object-cover object-center"
                />
            ) : null}
        </div>
    );
}
