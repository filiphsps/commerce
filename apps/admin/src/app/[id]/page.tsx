import 'server-only';

import { getSession } from '@/utils/auth';
import { getShop } from '@/utils/fetchers';
import { Button, Card, Heading } from '@nordcom/nordstar';
import type { Metadata } from 'next';
import { revalidateTag } from 'next/cache';
import { notFound } from 'next/navigation';

export type ShopPageProps = {
    params: {
        id: string;
    };
};

export const metadata: Metadata = {
    title: 'Overview'
};

export default async function ShopPage({ params: { id: shopId } }: ShopPageProps) {
    const session = await getSession();
    if (!session) return null;

    const shop = await getShop(session.user.id, shopId);
    if (!shop) {
        notFound();
    }

    return (
        <section>
            <Heading level="h2" as="h2">
                Overview
            </Heading>

            <Card>
                <Button
                    onClick={async () => {
                        'use server';

                        await revalidateTag(session.user.id);
                        await revalidateTag(shop.id);
                    }}
                >
                    Revalidate
                </Button>
            </Card>
        </section>
    );
}