import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import type { Metadata, Route } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';

export type ShopContentPageProps = {
    params: Promise<{
        domain: string;
    }>;
};

export const metadata: Metadata = {
    title: 'Content',
};

export default async function ShopContentPagePage({ params }: ShopContentPageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/' as Route);
    }

    const { domain } = await params;

    let shop: { id: string };
    try {
        shop = (await Shop.findByDomain(domain, { convert: true })) as { id: string };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }

    redirect(`/cms?tenant=${shop.id}` as Route);
}
