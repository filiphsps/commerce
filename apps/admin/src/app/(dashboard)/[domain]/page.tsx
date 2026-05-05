import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { Details, Heading } from '@nordcom/nordstar';

import { auth } from '@/auth';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import type { Metadata } from 'next';

export type ShopPageProps = {
    params: Promise<{
        domain: string;
    }>;
};

export const metadata: Metadata = {
    title: 'Home'
};

export default async function ShopPage({ params }: ShopPageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const { domain } = await params;

    let shop: Awaited<ReturnType<typeof Shop.findByDomain>>;
    try {
        shop = await Shop.findByDomain(domain, { convert: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }

    const code = JSON.stringify(shop, null, 4);

    return (
        <>
            <Heading level="h1">{shop.name}</Heading>
            <Heading level="h4" as="h2">
                <Link href={`https://${shop.domain}`} target="_blank" rel="noreferrer">
                    {shop.domain}
                </Link>
            </Heading>

            {/* Dropdown */}
            <Details label="Raw Shop">
                <code className="whitespace-pre-wrap">{code}</code>
            </Details>
        </>
    );
}
