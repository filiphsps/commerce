import { Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/prismic/page';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { SearchApi } from '@/api/shopify/search';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { showSearchFilter } from '@/utils/flags';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import { asText } from '@prismicio/client';

import PrismicPage from '@/components/cms/prismic-page';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';

import SearchContent from './search-content';

import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = false;

export type SearchPageParams = Promise<{ domain: string; locale: string }>;
export async function generateStaticParams(): Promise<Awaited<SearchPageParams>[]> {
    /** @note Limit pre-rendering when not in production. */
    if (process.env.VERCEL_ENV !== 'production') {
        return [];
    }

    const shops = await Shop.findAll();
    return (
        await Promise.all(
            shops.map(async ({ domain }) => {
                try {
                    const shop = await findShopByDomainOverHttp(domain);
                    if (shop.domain.includes('demo')) {
                        return [];
                    }

                    return [
                        {
                            domain: shop.domain,
                            locale: Locale.from('en-US').code
                        }
                    ];
                } catch (error: unknown) {
                    if (!Error.isNotFound(error)) {
                        console.error(error);
                    }

                    return [];
                }
            })
        )
    )
        .flat(1)
        .filter(Boolean);
}

export async function generateMetadata({ params }: { params: SearchPageParams }): Promise<Metadata> {
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
            languages: locales.reduce(
                (prev, { code }) => ({
                    ...prev,
                    [code]: `https://${shop.domain}/${code}/search/`
                }),
                {}
            )
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
                          secureUrl: page.meta_image!.url as string
                      }
                  ]
                : undefined
        }
    };
}

type SearchParams = Promise<{
    q?: string;
}>;

export default async function SearchPage({
    params,
    searchParams: queryParams
}: {
    params: SearchPageParams;
    searchParams: SearchParams;
}) {
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

    return (
        <>
            <Suspense key={`pages.search.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={t('search').toString()} />
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
                        showFilters={await showSearchFilter()}
                        data={{
                            products,
                            productFilters
                        }}
                    />
                </Suspense>
            </PageContent>
        </>
    );
}
