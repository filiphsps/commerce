import { Suspense } from 'react';

import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/prismic/page';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { enableProductsPage } from '@/utils/flags';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import { asText } from '@prismicio/client';
import { redirect, RedirectType } from 'next/navigation';

import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';

import ProductsContent from './products-content';

import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // TODO: Figure out a better way to deal with query params.
export const dynamicParams = true;
export const revalidate = false;

type SearchParams = Promise<{
    page?: string;
}>;

export type ProductsPageParams = Promise<{ domain: string; locale: string }>;
export async function generateStaticParams(): Promise<Awaited<ProductsPageParams>[]> {
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

export async function generateMetadata({
    params,
    searchParams: queryParams
}: {
    params: ProductsPageParams;
    searchParams: SearchParams;
}): Promise<Metadata> {
    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    const page = await PageApi({ shop, locale, handle: 'products' });
    const locales = await LocalesApi({ api });

    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    const searchParams = await queryParams;
    const pageNumber = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;

    const title =
        pageNumber > 1
            ? `${t('products')} - ${t('page-n', pageNumber.toString())}`
            : page?.meta_title || page?.title || capitalize(t('products'));
    const description = asText(page?.meta_description) || page?.description || undefined;
    return {
        title,
        description,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/products/${pageNumber > 1 ? `?page=${pageNumber}` : ''}`,
            languages: locales.reduce(
                (prev, { code }) => ({
                    ...prev,
                    [code]: `https://${shop.domain}/${code}/products/${pageNumber > 1 ? `?page=${pageNumber}` : ''}`
                }),
                {}
            )
        },
        openGraph: {
            url: `/products/`,
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

export default async function ProductsPage({
    params,
    searchParams: queryParams
}: {
    params: ProductsPageParams;
    searchParams: SearchParams;
}) {
    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);

    if (!(await enableProductsPage())) {
        redirect(`/${locale.code}/`, RedirectType.replace);
    }

    const searchParams = await queryParams;

    // Handle `?page=1` which should be removed.
    if (searchParams.page === '1') {
        const params = new URLSearchParams(searchParams);
        redirect(`/${locale.code}/products/${params.size > 0 ? '?' : ''}${params.toString()}`, RedirectType.replace);
    }

    // Fetch the current shop.
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    // Do the actual API calls.
    const page = await PageApi({ shop, locale, handle: 'products' });

    // Get dictionary of strings for the current locale.
    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);

    return (
        <>
            <Suspense key={`products.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={t('products').toString()} />
                </div>
            </Suspense>

            <PageContent>
                <Heading
                    title={page?.title || t('products')}
                    subtitle={page?.description}
                    titleClassName="capitalize"
                />

                <ProductsContent domain={domain} locale={locale} searchParams={searchParams} />
            </PageContent>
        </>
    );
}
