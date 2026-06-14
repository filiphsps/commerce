import type { OnlineShop } from '@nordcom/commerce-db';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import CollectionBlock from '@/components/products/collection-block';

import type { Locale } from '@/utils/locale';
import { clampPageSize } from '@/utils/page-size';

/**
 * Default collection page size when the shop sets no `commerce.productsPerPage`
 * override. Per-request `?limit=` is intentionally unsupported — it would
 * invalidate the parent's precomputed cursor array and page count.
 */
export const PRODUCTS_PER_PAGE = 21 as const;

/**
 * Resolves the effective collection page size for a shop: the per-shop
 * `commerce.productsPerPage` override clamped to Shopify's bounds, or
 * {@link PRODUCTS_PER_PAGE} when unset. The parent count precompute and the
 * content fetch MUST call this with the same shop so their `first` agree —
 * a mismatch breaks the cursor math.
 *
 * @param shop - The tenant shop carrying the optional `commerce.productsPerPage`.
 * @returns The page size to pass as the Shopify connection `first` argument.
 */
export function collectionPageSize(shop: OnlineShop): number {
    return clampPageSize(shop.commerce?.productsPerPage ?? PRODUCTS_PER_PAGE);
}

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
    const pageSize = collectionPageSize(shop);

    return (
        <Suspense key={JSON.stringify(searchParams)} fallback={<CollectionBlock.skeleton length={pageSize} />}>
            <CollectionBlock
                shop={shop}
                locale={locale}
                handle={handle}
                filters={{ first: pageSize, after }}
                showViewAll={false}
                priority={true}
            />
        </Suspense>
    );
}
