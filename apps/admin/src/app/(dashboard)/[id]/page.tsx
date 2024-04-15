import 'server-only';

import styles from './page.module.scss';

import { notFound, redirect } from 'next/navigation';

import { Error } from '@nordcom/commerce-errors';
import { Card, Heading } from '@nordcom/nordstar';

import { auth } from '@/utils/auth';
import { getShop } from '@/utils/fetchers';

import type { Metadata } from 'next';

export type ShopPageProps = {
    params: {
        id: string;
    };
};

export const metadata: Metadata = {
    title: 'Overview'
};

export default async function ShopPage({ params: { id: shopId } }: ShopPageProps) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            redirect('/auth/login/');
        }

        const shop = await getShop(session.user.id, shopId);

        return (
            <>
                <header>
                    <Heading level="h1">{shop.name}</Heading>
                    <Heading level="h4" as="h2">
                        Overview - {shop.domain}
                    </Heading>
                </header>
                <Card className={styles.container}>
                    {/* Dropdown */}
                    <details open className={styles.details}>
                        <summary>Shop</summary>

                        <code style={{ whiteSpace: 'pre' }}>{JSON.stringify(shop.toObject(), null, 2)}</code>
                    </details>
                </Card>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
