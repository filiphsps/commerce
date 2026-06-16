import { PackageOpen as EmptyProductsIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { Shop } from '@/api/_loaders';
import type { ProductSorting } from '@/api/product';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductsPaginationApi, ProductsPaginationCountApi } from '@/api/shopify/product';
import { Pagination } from '@/components/actionable/pagination';
import { EmptyState } from '@/components/empty-state';
import CollectionProductCard from '@/components/products/collection-product-card';
import { ProductFilters } from '@/components/products/product-filters';
import { getDictionary } from '@/utils/dictionary';
import { getTranslations, type Locale } from '@/utils/locale';

type SearchParams = {
    page?: string;
    vendor?: string;
    type?: string;
    available?: string;
    minPrice?: string;
    maxPrice?: string;
    sorting?: string;
};

/** Props for the `ProductsContent` server component. */
export type ProductsContentContentProps = {
    domain: string;
    locale: Locale;
    searchParams?: SearchParams;
};

/**
 * Parses a numeric query param, returning `undefined` for an absent or non-finite value so it never
 * compiles into a `variants.price:>=NaN` clause.
 *
 * @param raw - The raw query-param string.
 * @returns The finite number, or `undefined`.
 */
const numericParam = (raw: string | undefined): number | undefined => {
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
};

/** Every valid Shopify `ProductSortKeys` value the root `products` connection accepts. */
const VALID_SORTING = new Set<ProductSorting>([
    'BEST_SELLING',
    'CREATED_AT',
    'ID',
    'PRICE',
    'PRODUCT_TYPE',
    'RELEVANCE',
    'TITLE',
    'UPDATED_AT',
    'VENDOR',
]);

/**
 * Maps a raw `sorting` query param to a valid `ProductSortKeys`, falling back to `BEST_SELLING` for an
 * absent or unrecognized value. Guards the GraphQL `sortKey` argument: an arbitrary param (e.g. a stale
 * `CREATED`) would otherwise reach Shopify as an invalid enum literal and crash the page with a
 * `ProviderFetchError`.
 *
 * @param raw - The raw `sorting` query-param string.
 * @returns A valid sort key.
 */
const resolveSorting = (raw: string | undefined): ProductSorting => {
    const candidate = raw?.toUpperCase() as ProductSorting | undefined;
    return candidate && VALID_SORTING.has(candidate) ? candidate : 'BEST_SELLING';
};

/**
 * Server component that fetches and renders a paginated, faceted product grid for the all-products
 * page. The facet params (`vendor`, `type`, `available`, `minPrice`, `maxPrice`, `sorting`) compile
 * into a Shopify products-connection search query applied to BOTH the page-count traversal and the
 * page fetch, so pagination stays correct under filtering. A filtered-to-empty result renders the
 * shared empty state rather than a 404.
 *
 * @param domain - The tenant shop domain used to resolve the shop record.
 * @param locale - The active locale forwarded to Shopify API calls and product cards.
 * @param searchParams - Optional query params controlling pagination, sorting, and faceting.
 * @returns The faceted product listing.
 */
export default async function ProductsContent({ domain, locale, searchParams = {} }: ProductsContentContentProps) {
    const shop = await Shop.findByDomain(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const page = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
    const limit = 35; // TODO.
    const sorting = resolveSorting(searchParams.sorting);
    const facets = {
        vendor: searchParams.vendor || undefined,
        productType: searchParams.type || undefined,
        available_for_sale: searchParams.available === 'true' ? true : undefined,
        minPrice: numericParam(searchParams.minPrice),
        maxPrice: numericParam(searchParams.maxPrice),
    };

    const {
        cursors,
        pages,
        products: total,
        filters,
    } = await ProductsPaginationCountApi({ api, filters: { first: limit, ...facets } });
    // Only 404 a genuinely out-of-range page; a filter that matches nothing (pages <= 0) falls through
    // to the empty state below instead of a hard not-found.
    if (page < 1 || (pages >= 1 && page > pages)) {
        notFound();
    }

    const after = page > 1 ? cursors[page - 2] : undefined;

    const { products } = await ProductsPaginationApi({
        api,
        filters: { limit, sorting, after, ...facets },
    });

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('common', i18n);

    const pagination = (
        <section className="flex w-full items-center justify-center empty:hidden">
            <Suspense key="products.pagination" fallback={<div className="h-8 w-full" data-skeleton />}>
                <Pagination i18n={i18n} knownFirstPage={1} knownLastPage={pages} />
            </Suspense>
        </section>
    );

    return (
        <>
            <ProductFilters filters={filters} i18n={i18n} total={total} />

            {products.length > 0 ? (
                <>
                    {pagination}

                    <section className="grid w-full grid-cols-[repeat(auto-fill,minmax(min(11rem,calc((100%-0.5rem)/2)),1fr))] gap-2 md:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))]">
                        {products.map(({ node: product }) => (
                            <CollectionProductCard key={product.id} shop={shop} locale={locale} data={product} />
                        ))}
                    </section>

                    {pagination}
                </>
            ) : (
                <EmptyState
                    icon={<EmptyProductsIcon aria-hidden={true} />}
                    title={t('empty-collection-title')}
                    description={t('empty-collection-description')}
                />
            )}
        </>
    );
}
