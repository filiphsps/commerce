import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { notFound } from 'next/navigation';

import CollectionBlock from '@/components/products/collection-block';

import type { Locale } from '@/utils/locale';

// TODO: Make this dynamic, preferably a configurable default value and then a query param override.
export const PRODUCTS_PER_PAGE = 21 as const;

type SearchParams = {
    page?: string;
};

export async function CollectionContent({
    shop,
    locale,
    handle,
    searchParams = {},
    cursors
}: {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
    searchParams?: SearchParams;
    cursors: string[];
}) {
    if (typeof searchParams.page !== 'undefined' && isNaN(Number.parseInt(searchParams.page.toString()))) {
        notFound();
    }

    const page = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
    const after = page > 1 ? cursors[page - 2] : undefined;

    return (
        <Suspense key={JSON.stringify(searchParams)} fallback={<CollectionBlock.skeleton length={PRODUCTS_PER_PAGE} />}>
            <CollectionBlock
                shop={shop}
                locale={locale}
                handle={handle}
                filters={{ first: PRODUCTS_PER_PAGE, after }}
                showViewAll={false}
                priority={true}
            />
        </Suspense>
    );
}
