import 'server-only';

import { notFound, redirect } from 'next/navigation';

import { Card, Heading } from '@nordcom/nordstar';

import { auth } from '@/auth';
import { getShop } from '@/utils/fetchers';

import type { Metadata } from 'next';

export const revalidate = 30;

export type ShopSettingsBillingPageProps = {
    params: {
        id: string;
    };
};

export const metadata: Metadata = {
    title: 'Billing'
};

export default async function ShopSettingsBillingPage({ params: { id: shopId } }: ShopSettingsBillingPageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const shop = await getShop(session.user.id!, shopId);
    if (!shop) {
        notFound();
    }

    return (
        <section>
            <Heading level="h2" as="h2">
                Billing
            </Heading>
            <Card></Card>
        </section>
    );
}
