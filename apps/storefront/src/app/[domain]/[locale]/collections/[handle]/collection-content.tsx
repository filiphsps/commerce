import type { OnlineShop } from '@nordcom/commerce-db';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import CollectionBlock from '@/components/products/collection-block';

import type { Locale } from '@/utils/locale';

// TODO: Make this dynamic, preferably a configurable default value and then a query param override.
export const PRODUCTS_PER_PAGE = 21 as const;

type SearchParams = {
    page?: string;
};

/**
 * Server component rendering a paginated product grid for a collection.
 * Validates the page number against the known page count and calls
 * `notFound()` for out-of-range or non-numeric page params.
 *
 * @param shop - The tenant shop, forwarded to `CollectionBlock` for API calls.
 * @param locale - The active locale forwarded to `CollectionBlock`.
 * @param handle - The Shopify collection handle to render.
 * @param searchParams - Optional query params; `page` controls the current page.
 * @param pagesInfo - Pre-fetched cursor array and total page count from the parent.
 * @returns The paginated collection product grid wrapped in `Suspense`.
 */
export async function CollectionContent({
    shop,
    locale,
    handle,
    searchParams = {},
    pagesInfo: { cursors, pages },
}: {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
    searchParams?: SearchParams;
    pagesInfo: { cursors: string[]; pages: number; products: number };
}) {
    if (typeof searchParams.page !== 'undefined' && Number.isNaN(Number.parseInt(searchParams.page.toString(), 10))) {
        notFound();
    }

    const page = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
    if (page > pages || page < 1) {
        notFound();
    }

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
