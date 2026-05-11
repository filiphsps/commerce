import { Shop } from '@nordcom/commerce-db';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { Suspense } from 'react';
import { PageApi } from '@/api/prismic/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { SearchApi } from '@/api/shopify/search';
import { LocalesApi } from '@/api/store';
import PrismicPage from '@/components/cms/prismic-page';
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

    const page = await PageApi({ shop, locale, handle: 'search' });
    const locales = await LocalesApi({ api });

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    const title = page?.meta_title || page?.title || capitalize(t('search'));
    const description = asText(page?.meta_description) || page?.description || undefined;
    return {
        title,
        description,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/search/`,
            languages: Object.fromEntries(locales.map(({ code }) => [code, `https://${shop.domain}/${code}/search/`])),
        },
        openGraph: {
            url: `/search/`,
            type: 'website',
            title,
            description,
            siteName: shop.name,
            locale: locale.code,
            images: page?.meta_image
                ? [
                      {
                          url: page.meta_image!.url as string,
                          width: page.meta_image!.dimensions?.width || 0,
                          height: page.meta_image!.dimensions?.height || 0,
                          alt: page.meta_image!.alt || '',
                          secureUrl: page.meta_image!.url as string,
                      },
                  ]
                : undefined,
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
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const page = await PageApi({ shop, locale, handle: 'search' });

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    const searchParams = await queryParams;
    const query = searchParams.q?.toString() || null;

    const client = await ShopifyApolloApiClient({ shop, locale });
    const { products, productFilters } = query
        ? await SearchApi({ query, client })
        : { products: [], productFilters: [] };

    // Use `readFlag` instead of `showSearchFilter()` — `@vercel/flags/next`'s
    // `flag()` wrapper reads request headers internally, which is forbidden inside
    // the `'use cache'` scope that wraps this component.
    const showFilters = await readFlag('search-filter', false);

    return (
        <>
            <Suspense key={`pages.search.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={t('search')} />
                </div>
            </Suspense>

            <PageContent>
                <Heading title={page?.title} subtitle={page?.description} />

                {page?.slices && page.slices.length > 0 ? (
                    <PrismicPage shop={shop} locale={locale} page={page} handle={'search'} type={'custom_page'} />
                ) : null}

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
