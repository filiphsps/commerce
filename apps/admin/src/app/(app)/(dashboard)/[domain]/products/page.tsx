import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import type { Metadata, Route } from 'next';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ContentScrollRegion } from '@/components/shell/content-scroll-region';
import { PageHeader } from '@/components/shell/page-header';

export type ShopProductsPageProps = { params: Promise<{ domain: string }> };

export const metadata: Metadata = { title: 'Products' };

export default async function ShopProductsPage({ params }: ShopProductsPageProps) {
    const session = await auth();
    if (!session?.user) redirect('/auth/login/' as Route);

    const { domain } = await params;
    try {
        await Shop.findByDomain(domain, { convert: true });
    } catch (error: unknown) {
        if (Error.isNotFound(error)) notFound();
        throw error;
    }

    return (
        <ContentScrollRegion>
            <PageHeader title="Products" />
            <div className="flex flex-col gap-4 px-6 py-6 text-muted-foreground">Products UI coming soon.</div>
        </ContentScrollRegion>
    );
}
