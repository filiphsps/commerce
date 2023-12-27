import 'server-only';

import { getSession } from '#/utils/auth';
import { getShop } from '#/utils/fetchers';
import { Card, Label } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export type ShopSettingsBillingPageProps = {
    params: {
        id: string;
    };
};

export const metadata: Metadata = {
    title: 'Billing'
};

export default async function ShopSettingsBillingPage({ params: { id: shopId } }: ShopSettingsBillingPageProps) {
    const session = await getSession();
    if (!session) return null;

    const shop = await getShop(session.user.id, shopId);
    if (!shop) {
        return notFound();
    }

    return (
        <section>
            <Label>Billing</Label>
            <Card></Card>
        </section>
    );
}
