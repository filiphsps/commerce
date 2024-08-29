import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { Heading } from '@nordcom/nordstar';

import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';

import type { Metadata } from 'next';

export type ShopContentPageProps = {
    params: {
        domain: string;
    };
};

export const metadata: Metadata = {
    title: 'Content'
};

export default async function ShopContentPagePage({ params: { domain } }: ShopContentPageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    try {
        const shop = await Shop.findByDomain(domain, { convert: true });
        const code = JSON.stringify(shop, null, 4);

        return (
            <>
                <Heading level="h1">Content</Heading>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
