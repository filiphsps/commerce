import { Shop } from '@nordcom/commerce-db';

import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductsPaginationApi, ProductsPaginationCountApi } from '@/api/shopify/product';
import { cn } from '@/utils/tailwind';
import { notFound } from 'next/navigation';

import { Filters } from '@/components/actionable/filters';
import { Pagination } from '@/components/actionable/pagination';
import ProductCard from '@/components/product-card/product-card';

import type { ProductSorting } from '@/api/product';
import type { Locale } from '@/utils/locale';

type SearchParams = {
    page?: string;
    vendor?: string;
    sorting?: string;
};

export type ProductsContentContentProps = {
    domain: string;
    locale: Locale;
    searchParams?: SearchParams;
};
export default async function ProductsContent({ domain, locale, searchParams = {} }: ProductsContentContentProps) {
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    const page = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
    const limit = 35; // TODO.
    const vendor = searchParams.vendor || undefined;
    const sorting = (searchParams.sorting?.toUpperCase() || 'BEST_SELLING') as ProductSorting;

    const { cursors, pages } = await ProductsPaginationCountApi({ api, filters: { first: limit } });
    if (page > pages || page < 1) {
        notFound();
    }

    const after = page > 1 ? cursors[page - 2] : undefined;

    const { products, filters } = await ProductsPaginationApi({ api, filters: { limit, vendor, sorting, after } });

    const pagination = <Pagination knownFirstPage={1} knownLastPage={pages} morePagesAfterKnownLastPage={false} />;

    return (
        <>
            {pagination}

            <Filters filters={filters} />

            <section
                className={cn(
                    'grid w-full grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]'
                )}
            >
                {products.map(({ node: product }) => (
                    <ProductCard key={product.id} shop={shop} locale={locale} data={product} />
                ))}
            </section>

            {pagination}
        </>
    );
}
