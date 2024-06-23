/* eslint-disable react-hooks/rules-of-hooks */

import { Suspense } from 'react';
import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { Locale, useTranslation } from '@/utils/locale';
import { asText } from '@prismicio/client';

import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';

import SearchContent from './search-content';

import type { Metadata } from 'next';

export type SearchPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: SearchPageParams;
}): Promise<Metadata> {
    try {
        const locale = Locale.from(localeData);

        const shop = await ShopApi(domain, cache);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const page = await PageApi({ shop, locale, handle: 'search', type: 'custom_page' });
        const locales = await LocalesApi({ api });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        const title = page?.meta_title || page?.title || t('search');
        const description = (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;
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

export default async function SearchPage({ params: { domain, locale: localeData } }: { params: SearchPageParams }) {
    try {
        const locale = Locale.from(localeData);

        const shop = await ShopApi(domain, cache);
        const page = await PageApi({ shop, locale, handle: 'search', type: 'custom_page' });

        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        return (
            <>
                <Heading title={page?.title || t('search')} subtitle={page?.description} />

                {page?.slices && page.slices.length > 0 ? (
                    <PrismicPage
                        shop={shop}
                        locale={locale}
                        page={page}
                        i18n={i18n}
                        handle={'search'}
                        type={'custom_page'}
                    />
                ) : null}

                <Suspense fallback={null}>
                    <SearchContent
                        //client={await ShopifyApolloApiClient({ shop, locale })}
                        shop={shop}
                        locale={locale}
                        i18n={i18n}
                    />
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
