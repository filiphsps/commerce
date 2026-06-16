import 'server-only';
import type { OnlineShop } from '@nordcom/commerce-db';

import { Suspense } from 'react';
import { SearchApi } from '@/api/_loaders';
import type { Product, ProductFilters } from '@/api/product';
import { Blocks } from '@/blocks/blocks';
import type { BlockNode } from '@/blocks/types';
import ProductCard from '@/components/product-card';
import SearchProductCard from '@/components/products/search-product-card';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import SearchContent from './search-content';

/** Platform-default search-landing copy + popular terms, used when a tenant has not seeded the `search` singleton. */
const SEARCH_LANDING_DEFAULTS = {
    heading: 'Search our store',
    subheading: 'Find products, brands, and collections — start typing above.',
    popularSearches: ['Sale', 'New in', 'Best sellers'],
} as const;

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
export default async function SearchContentGate({ shop, locale, i18n, showFilters, data }: SearchContentGateProps) {
    const { products = [], productFilters = [], totalCount } = data;

    const productCards = products.map((product) => (
        <Suspense key={product.id} fallback={<ProductCard.skeleton layout="horizontal" chrome="boxed" />}>
            <SearchProductCard shop={shop} locale={locale} data={product} />
        </Suspense>
    ));

    const skeletonCards = Array.from({ length: 6 }).map((_, index) => (
        <ProductCard.skeleton key={index} layout="horizontal" chrome="boxed" />
    ));

    // No-query landing, sourced from the tenant-editable `search` singleton with a platform-default
    // fallback. Blocks render here (server-only) and pass down as a node; the popular-search terms go
    // down as plain strings so the client can wire them to the search runner.
    const search = await SearchApi({ shop, locale });
    const landingHeading = search?.heading || SEARCH_LANDING_DEFAULTS.heading;
    const landingSubheading = search?.subheading || SEARCH_LANDING_DEFAULTS.subheading;
    const seededTerms = (search?.popularSearches ?? [])
        .map((entry) => entry?.term)
        .filter((term): term is string => typeof term === 'string' && term.trim().length > 0);
    const popularSearches = seededTerms.length > 0 ? seededTerms : [...SEARCH_LANDING_DEFAULTS.popularSearches];
    const landingBlocks = (search?.blocks ?? []) as BlockNode[];
    const landingExtra = landingBlocks.length > 0 ? <Blocks blocks={landingBlocks} context={{ shop, locale }} /> : null;

    return (
        <SearchContent
            locale={locale}
            i18n={i18n}
            showFilters={showFilters}
            productCards={productCards}
            skeletonCards={skeletonCards}
            productFilters={productFilters}
            totalCount={totalCount}
            landingHeading={landingHeading}
            landingSubheading={landingSubheading}
            popularSearches={popularSearches}
            landingExtra={landingExtra}
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
