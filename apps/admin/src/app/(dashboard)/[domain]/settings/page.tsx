import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { Heading } from '@nordcom/nordstar';

import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';

import type { Metadata } from 'next';

export type ShopSettingsPageProps = {
    params: Promise<{
        domain: string;
    }>;
};

export const metadata: Metadata = {
    title: 'Settings'
};

export default async function ShopSettingsPagePage({ params }: ShopSettingsPageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/');
    }

    const { domain } = await params;

    try {
        const _shop = await Shop.findByDomain(domain, { convert: true });

        return (
            <>
                <Heading level="h1">Settings</Heading>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
