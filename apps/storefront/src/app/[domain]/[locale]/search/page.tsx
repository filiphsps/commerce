import { Shop } from '@nordcom/commerce-db';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { Suspense } from 'react';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { SearchApi } from '@/api/shopify/search';
import { LocalesApi } from '@/api/store';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { readFlag } from '@/utils/flags-cache-safe';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import SearchContent from './search-content';

export type SearchPageParams = Promise<{ domain: string; locale: string }>;
export async function generateMetadata({ params }: { params: SearchPageParams }): Promise<Metadata> {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    const locales = await LocalesApi({ api });

    const i18n = await getDictionary(locale);
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
    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    const client = await ShopifyApolloApiClient({ shop, locale });
    const { products, productFilters } = query
        ? await SearchApi({ query, client })
        : { products: [], productFilters: [] };

    const showFilters = await readFlag('search-filter', false);

    return (
        <>
            <Suspense key={`pages.search.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={t('search')} />
                </div>
            </Suspense>

            <PageContent>
                <Heading title={capitalize(t('search'))} />

                <Suspense key={`pages.search.${JSON.stringify(searchParams)}`}>
                    <SearchContent
                        locale={locale}
                        i18n={i18n}
                        showFilters={showFilters}
                        data={{
                            products,
                            productFilters,
                        }}
                    />
                </Suspense>
            </PageContent>
        </>
    );
}
