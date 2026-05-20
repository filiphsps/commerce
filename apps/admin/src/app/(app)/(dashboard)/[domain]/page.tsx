import 'server-only';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { Details } from '@nordcom/nordstar';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/auth';
import { ContentScrollRegion } from '@/components/shell/content-scroll-region';
import { PageHeader } from '@/components/shell/page-header';

export type ShopPageProps = {
    params: Promise<{
        domain: string;
    }>;
};

export const metadata: Metadata = {
    title: 'Home',
};

export default async function ShopPage({ params }: ShopPageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect('/auth/login/' as Route);
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
        <ContentScrollRegion>
            <PageHeader title="Home" />

            <div className="flex flex-col gap-4 px-6 py-6">
                <div className="flex flex-col gap-1">
                    <span className="font-semibold text-lg">{shop.name}</span>
                    <Link
                        href={`https://${shop.domain}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground text-sm hover:text-primary hover:underline"
                    >
                        {shop.domain}
                    </Link>
                </div>

                {/* Dropdown */}
                <Details label="Raw Shop">
                    <code className="whitespace-pre-wrap">{code}</code>
                </Details>
            </div>
        </ContentScrollRegion>
    );
}
