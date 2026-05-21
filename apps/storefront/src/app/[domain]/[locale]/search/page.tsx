import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { LocalesApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { SearchApi } from '@/api/shopify/search';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { NOT_FOUND_HANDLE } from '@/utils/handle';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import SearchContentGate from './search-content-gate';

export type SearchPageParams = Promise<{ domain: string; locale: string }>;
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

type SearchParams = Promise<{
    q?: string;
}>;

export default async function SearchPage({
    params,
    searchParams: queryParams,
}: {
    params: SearchPageParams;
    searchParams: SearchParams;
}) {
    const searchParams = await queryParams;
    const query = searchParams.q?.toString() || null;

    const { domain, locale: localeData } = await params;
    if (!domain || domain === NOT_FOUND_HANDLE) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    const [i18n, client] = await Promise.all([getDictionary(locale), ShopifyApolloApiClient({ shop, locale })]);
    const { t } = getTranslations('common', i18n);
    const { products, productFilters, totalCount } = query
        ? await SearchApi({ query, client })
        : { products: [], productFilters: [], totalCount: 0 };

    return (
        <>
            <Suspense key={`pages.search.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-5 empty:hidden md:-mb-9">
                    <Breadcrumbs locale={locale} title={t('search')} />
                </div>
            </Suspense>

            <PageContent>
                <Heading title={capitalize(t('search'))} />

                <Suspense key={`pages.search.${JSON.stringify(searchParams)}`}>
                    <SearchContentGate
                        shop={shop}
                        locale={locale}
                        i18n={i18n}
                        data={{ products, productFilters, totalCount }}
                    />
                </Suspense>
            </PageContent>
        </>
    );
}
