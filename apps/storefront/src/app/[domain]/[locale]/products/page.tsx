/* eslint-disable react-hooks/rules-of-hooks */

import { Suspense } from 'react';
import { unstable_cache as cache } from 'next/cache';
import { notFound, redirect, RedirectType } from 'next/navigation';

import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductsPaginationCountApi } from '@/api/shopify/product';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { Locale, useTranslation } from '@/utils/locale';
import { asText } from '@prismicio/client';

import Pagination from '@/components/actionable/pagination';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import Heading from '@/components/typography/heading';

import ProductsContent from './products-content';

import type { Metadata } from 'next';

// TODO: Figure out a better way to deal with query params.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// TODO: Make this dynamic, preferably a configurable default value and then a query param override.
const PRODUCTS_PER_PAGE = 16 as const;

type FilterParams = {
    page?: string;
};

export type ProductsPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: ProductsPageParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const shop = await ShopApi(domain, cache);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const { page } = await PageApi({ shop, locale, handle: 'products', type: 'custom_page' });
        const locales = await LocalesApi({ api });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        const title = page?.meta_title || page?.title || t('products');
        const description = (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
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
                images:
                    (page?.meta_image && [
                        {
                            url: page.meta_image!.url as string,
                            width: page.meta_image!.dimensions?.width || 0,
                            height: page.meta_image!.dimensions?.height || 0,
                            alt: page.meta_image!.alt || '',
                            secureUrl: page.meta_image!.url as string
                        }
                    ]) ||
                    undefined
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}

export default async function ProductsPage({
    params: { domain, locale: localeData },
    searchParams
}: {
    params: ProductsPageParams;
    searchParams: FilterParams;
}) {
    try {
        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        if (searchParams.page && isNaN(parseInt(searchParams.page))) notFound();

        // Fetch the current shop.
        const shop = await ShopApi(domain, cache);

        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });

        // Deal with pagination before fetching the collection.
        const pagesInfo = await ProductsPaginationCountApi({ api, filters: { first: PRODUCTS_PER_PAGE } });

        // Do the actual API calls.
        //const products = await ProductsApi({ api, filters: { first: PRODUCTS_PER_PAGE, after } }, cache);
        const { page } = await PageApi({ shop, locale, handle: 'products', type: 'custom_page' });

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        redirect(`/${locale.code}/`, RedirectType.replace);

        return (
            <>
                <Heading title={page?.title || 'Products'} subtitle={page?.description} />

                <ProductsContent />

                <Suspense key={`${shop.id}.products.pagination`} fallback={<Pagination knownFirstPage={1} />}>
                    <Pagination knownFirstPage={1} knownLastPage={pagesInfo.pages} />
                </Suspense>

                <Suspense key={`${shop.id}.products.breadcrumbs`}>
                    <Breadcrumbs shop={shop} title={t('products')} />
                </Suspense>
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
