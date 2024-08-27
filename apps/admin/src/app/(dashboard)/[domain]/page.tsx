import 'server-only';

import styles from './page.module.scss';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { Card, Details, Heading } from '@nordcom/nordstar';

import { auth } from '@/auth';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import type { Metadata } from 'next';

export type ShopPageProps = {
    params: {
        domain: string;
    };
};

export const metadata: Metadata = {
    title: 'Overview'
};

export default async function ShopPage({ params: { domain } }: ShopPageProps) {
    try {
        const session = await auth();
        if (!session?.user) {
            redirect('/auth/login/');
        }

        const shop = await Shop.findByDomain(domain, { convert: true });
        const code = JSON.stringify(shop, null, 4);

        return (
            <>
                <header>
                    <Heading level="h1">{shop.name}</Heading>
                    <Heading level="h4" as="h2">
                        Overview,{' '}
                        <Link href={`https://${shop.domain}`} target="_blank" rel="noreferrer">
                            {shop.domain}
                        </Link>
                    </Heading>
                </header>

                <Card className={styles.container}>
                    {/* Dropdown */}
                    <Details label="Raw Shop" className={styles.details}>
                        <code>{code}</code>
                    </Details>
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
