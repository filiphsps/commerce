import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';
import { LocalesApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
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
type SearchParams = Promise<{ q?: string }>;

export async function generateMetadata({ params }: { params: SearchPageParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
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
    const [{ domain, locale: localeData }, { q }] = await Promise.all([params, searchParams]);
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const i18n = await getDictionary(locale);

    const query = q?.toString() ?? '';
    const showFilters = await searchFilter();

    const data = await cachedSearch({
        shopId: shop.id,
        shopDomain: shop.domain,
        localeCode: locale.code,
        query,
        showFilters,
    });

    return <SearchContentGate shop={shop} locale={locale} i18n={i18n} data={data} showFilters={showFilters} />;
}
