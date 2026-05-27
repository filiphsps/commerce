import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';

import { Suspense } from 'react';
import type { Product, ProductFilters } from '@/api/product';
import ProductCard from '@/components/product-card';
import SearchProductCard from '@/components/products/search-product-card';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import SearchContent from './search-content';

/** Props for the `SearchContentGate` server component. */
export type SearchContentGateProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    showFilters: boolean;
    data: { products?: Product[]; productFilters?: ProductFilters; totalCount?: number };
};

/**
 * Server component that bridges the search page's server-fetched product data
 * into the client `SearchContent` component. Constructs pre-rendered product
 * card nodes (wrapped in `Suspense`) and skeleton placeholders, then passes
 * both to `SearchContent` so the client component can swap between them during
 * pending transitions without making additional server requests.
 *
 * @param shop - The tenant shop, forwarded to each `SearchProductCard`.
 * @param locale - The active locale forwarded to product cards and `SearchContent`.
 * @param i18n - The locale dictionary forwarded to `SearchContent`.
 * @param showFilters - Whether `SearchContent` should render filter controls.
 * @param data - Server-fetched search results containing products, filters, and total count.
 * @returns The `SearchContent` client component with pre-rendered product and skeleton cards.
 */
export default function SearchContentGate({ shop, locale, i18n, showFilters, data }: SearchContentGateProps) {
    const { products = [], productFilters = [], totalCount } = data;

    const productCards = products.map((product) => (
        <Suspense key={product.id} fallback={<ProductCard.skeleton layout="horizontal" chrome="boxed" />}>
            <SearchProductCard shop={shop} locale={locale} data={product} />
        </Suspense>
    ));

    const skeletonCards = Array.from({ length: 6 }).map((_, index) => (
        <ProductCard.skeleton key={index} layout="horizontal" chrome="boxed" />
    ));

    return (
        <SearchContent
            locale={locale}
            i18n={i18n}
            showFilters={showFilters}
            productCards={productCards}
            skeletonCards={skeletonCards}
            productFilters={productFilters}
            totalCount={totalCount}
        />
    );
}

/**
 * Skeleton placeholder for the search results list, rendering six horizontal
 * card placeholders while the real results are loading.
 *
 * @returns The skeleton results list element.
 */
SearchContentGate.Skeleton = function SearchContentGateSkeleton() {
    return (
        <div className="flex flex-col gap-0">
            {Array.from({ length: 6 }).map((_, index) => (
                <ProductCard.skeleton key={index} layout="horizontal" chrome="boxed" />
            ))}
        </div>
    );
};
