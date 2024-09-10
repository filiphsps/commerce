/* eslint-disable react-hooks/rules-of-hooks */

import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductsPaginationCountApi } from '@/api/shopify/product';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { enableProductsPage } from '@/utils/flags';
import { Locale, useTranslation } from '@/utils/locale';
import { asText } from '@prismicio/client';
import { notFound, redirect, RedirectType } from 'next/navigation';

import Pagination from '@/components/actionable/pagination';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import Heading from '@/components/typography/heading';

import ProductsContent from './products-content';

import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // TODO: Figure out a better way to deal with query params.
export const dynamicParams = true;
export const revalidate = false;

export type ProductsPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: ProductsPageParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);

        const shop = await Shop.findByDomain(domain, { sensitiveData: true });
        const api = await ShopifyApolloApiClient({ shop, locale });

        const page = await PageApi({ shop, locale, handle: 'products' });
        const locales = await LocalesApi({ api });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        const title = page?.meta_title || page?.title || t('products');
        const description = asText(page?.meta_description) || page?.description || undefined;
        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domain}/${locale.code}/products/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}/products/`
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
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        throw error;
    }
}

async function ProductsPagination({ shop, locale }: { shop: OnlineShop; locale: Locale }) {
    // Setup the AbstractApi client.
    const api = await ShopifyApolloApiClient({ shop, locale });

    // Deal with pagination before fetching the collection.
    const pagesInfo = await ProductsPaginationCountApi({ api, filters: {} });

    return (
        <>
            <Pagination knownFirstPage={0} knownLastPage={pagesInfo.pages} morePagesAfterKnownLastPage={false} />
        </>
    );
}

export default async function ProductsPage({ params: { domain, locale: localeData } }: { params: ProductsPageParams }) {
    try {
        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeData);

        if (!(await enableProductsPage())) {
            redirect(`/${locale.code}/`, RedirectType.replace);
        }

        // Fetch the current shop.
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });

        // Do the actual API calls.
        //const products = await ProductsApi({ api, filters, cache);
        const page = await PageApi({ shop, locale, handle: 'products' });

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        return (
            <>
                <Suspense fallback={<BreadcrumbsSkeleton />}>
                    <div className="-mb-[1.5rem] empty:hidden md:-mb-[2.25rem]">
                        <Breadcrumbs locale={locale} title={t('products')} />
                    </div>
                </Suspense>

                <Heading
                    title={page?.title || t('products')}
                    subtitle={page?.description}
                    titleClassName="capitalize"
                />

                <Suspense>
                    <ProductsContent />
                </Suspense>

                <Suspense fallback={<div className="h-14 w-full" data-skeleton />}>
                    <ProductsPagination shop={shop} locale={locale} />
                </Suspense>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        console.error(error);
        throw error;
    }
}
