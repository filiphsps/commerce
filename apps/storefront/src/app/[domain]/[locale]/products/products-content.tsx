import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Shop } from '@/api/_loaders';
import type { ProductSorting } from '@/api/product';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductsPaginationApi, ProductsPaginationCountApi } from '@/api/shopify/product';
import { Filters } from '@/components/actionable/filters';
import { Pagination } from '@/components/actionable/pagination';
import CollectionProductCard from '@/components/products/collection-product-card';
import { getDictionary } from '@/utils/dictionary';
import type { Locale } from '@/utils/locale';
import { clampPageSize } from '@/utils/page-size';
import { cn } from '@/utils/tailwind';

type SearchParams = {
    page?: string;
    vendor?: string;
    sorting?: string;
};

/** Props for the `ProductsContent` server component. */
export type ProductsContentContentProps = {
    domain: string;
    locale: Locale;
    searchParams?: SearchParams;
};
/**
 * Server component that fetches and renders a paginated, filterable product
 * grid for the all-products page. Calls `notFound()` when the requested page
 * number is out of range.
 *
 * @param domain - The tenant shop domain used to resolve the shop record.
 * @param locale - The active locale forwarded to Shopify API calls and product cards.
 * @param searchParams - Optional query params; `page`, `vendor`, and `sorting` control the listing.
 * @returns The product grid with pagination controls above and below.
 */
export default async function ProductsContent({ domain, locale, searchParams = {} }: ProductsContentContentProps) {
    const shop = await Shop.findByDomain(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const page = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
    const limit = clampPageSize(shop.commerce?.productsPerPage ?? 35);
    const vendor = searchParams.vendor || undefined;
    const sorting = (searchParams.sorting?.toUpperCase() || 'BEST_SELLING') as ProductSorting;

    const { cursors, pages } = await ProductsPaginationCountApi({ api, filters: { first: limit } });
    if (page > pages || page < 1) {
        notFound();
    }

    const after = page > 1 ? cursors[page - 2] : undefined;

    const { products, filters } = await ProductsPaginationApi({ api, filters: { limit, vendor, sorting, after } });

    const i18n = await getDictionary({ shop, locale });
    const pagination = (
        <section className="flex w-full items-center justify-center empty:hidden">
            <Suspense key={`products.pagination`} fallback={<div className="h-8 w-full" data-skeleton />}>
                <Pagination i18n={i18n} knownFirstPage={1} knownLastPage={pages} />
            </Suspense>
        </section>
    );

    return (
        <>
            {pagination}

            <Filters filters={filters} />

            <section
                className={cn(
                    'grid w-full grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]',
                )}
            >
                {products.map(({ node: product }) => (
                    <CollectionProductCard key={product.id} shop={shop} locale={locale} data={product} />
                ))}
            </section>

            {pagination}
        </>
    );
}
