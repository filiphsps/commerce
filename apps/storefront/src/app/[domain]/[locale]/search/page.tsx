import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';
import { LocalesApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { buildProductsQueryString } from '@/api/shopify/product';
import { cachedSearch } from '@/api/shopify/search';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { searchFilter } from '@/utils/flags/definitions';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import SearchContentGate from './search-content-gate';

export type SearchPageParams = Promise<{ domain: string; locale: string }>;
type SearchParams = Promise<{
    q?: string;
    vendor?: string;
    type?: string;
    available?: string;
    minPrice?: string;
    maxPrice?: string;
}>;

export async function generateMetadata({ params }: { params: SearchPageParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [locales, i18n] = await Promise.all([LocalesApi({ api }), getDictionary(locale)]);
    const { t } = getTranslations('common', i18n);

    const title = capitalize(t('search'));
    return {
        title,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/search/`,
            languages: Object.fromEntries(locales.map(({ code }) => [code, `https://${shop.domain}/${code}/search/`])),
        },
        openGraph: {
            url: `/search/`,
            type: 'website',
            title,
            siteName: shop.name,
            locale: locale.code,
        },
    };
}

export default async function SearchPage({
    params,
    searchParams,
}: {
    params: SearchPageParams;
    searchParams: SearchParams;
}) {
    return (
        <SearchShell params={params}>
            <Suspense fallback={<SearchContentGate.Skeleton />}>
                <SearchResults params={params} searchParams={searchParams} />
            </Suspense>
        </SearchShell>
    );
}

async function SearchShell({ params, children }: { params: SearchPageParams; children: ReactNode }) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    return (
        <>
            <Suspense key="pages.search.breadcrumbs" fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-5 empty:hidden md:-mb-9">
                    <Breadcrumbs locale={locale} title={t('search')} />
                </div>
            </Suspense>

            <PageContent>
                <Heading title={capitalize(t('search'))} />
                {children}
            </PageContent>
        </>
    );
}

async function SearchResults({ params, searchParams }: { params: SearchPageParams; searchParams: SearchParams }) {
    const [{ domain, locale: localeData }, sp] = await Promise.all([params, searchParams]);
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain);
    const i18n = await getDictionary(locale);

    const query = sp.q?.toString() ?? '';
    const showFilters = await searchFilter();

    // Fold the selected facets into the search query (Shopify search accepts the same syntax as the
    // products connection), reusing the products query-builder so /products and search filter
    // identically. Facets only apply to an actual text query; with no `q` the page shows the landing.
    const facetQuery = buildProductsQueryString({
        vendor: sp.vendor || undefined,
        productType: sp.type || undefined,
        available_for_sale: sp.available === 'true' ? true : undefined,
        minPrice: sp.minPrice ? Number(sp.minPrice) : undefined,
        maxPrice: sp.maxPrice ? Number(sp.maxPrice) : undefined,
    });
    const combinedQuery = query ? [query, facetQuery].filter(Boolean).join(' ') : '';

    const data = await cachedSearch({
        shopId: shop.id,
        shopDomain: shop.domain,
        localeCode: locale.code,
        query: combinedQuery,
        showFilters,
    });

    return <SearchContentGate shop={shop} locale={locale} i18n={i18n} data={data} showFilters={showFilters} />;
}
