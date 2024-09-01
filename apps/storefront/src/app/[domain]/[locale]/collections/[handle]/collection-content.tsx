import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { notFound } from 'next/navigation';

import CollectionBlock from '@/components/products/collection-block';

import type { Locale } from '@/utils/locale';

// TODO: Make this dynamic, preferably a configurable default value and then a query param override.
export const PRODUCTS_PER_PAGE = 21 as const;

export async function CollectionContent({
    shop,
    locale,
    handle,
    searchParams,
    cursors
}: {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
    searchParams: { [key: string]: string | string[] | undefined };
    cursors: string[];
}) {
    if (typeof searchParams.page !== 'undefined' && isNaN(Number.parseInt(searchParams.page.toString()))) {
        notFound();
    }

    const page = Number.parseInt(searchParams.page?.toString() || '1');
    const after = cursors[page - 2];

    return (
        <Suspense
            key={JSON.stringify(searchParams)}
            fallback={<CollectionBlock.skeleton length={PRODUCTS_PER_PAGE} bare={true} />}
        >
            <CollectionBlock
                shop={shop}
                locale={locale}
                handle={handle}
                filters={{ first: PRODUCTS_PER_PAGE, after }}
                bare={true}
            />
        </Suspense>
    );
}
