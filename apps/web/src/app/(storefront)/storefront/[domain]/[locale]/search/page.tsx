import { PageApi } from '@/api/page';
import { ShopApi, ShopsApi } from '@/api/shop';
import { ShopifyApiClient, ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi, StoreApi } from '@/api/store';
import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { Error } from '@/utils/errors';
import { Locale, useTranslation } from '@/utils/locale';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { metadata as notFoundMetadata } from '../not-found';
import SearchContent from './search-content';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
export const dynamicParams = true;
export async function generateStaticParams() {
    const locale = Locale.default;
    const shops = await ShopsApi();

    return (
        await Promise.all(
            shops
                .map(async (shop) => {
                    try {
                        const api = await ShopifyApiClient({ shop, locale });
                        const locales = await LocalesApi({ api });
                        const domain = shop.domains.primary;

                        return locales.map(({ code }) => ({
                            domain,
                            locale: code
                        }));
                    } catch {
                        return null;
                    }
                })
                .filter((_) => _)
        )
    ).flat(2);
}
/* c8 ignore stop */

/* c8 ignore start */
export type SearchPageParams = { domain: string; locale: string };
export async function generateMetadata({
    params: { domain, locale: localeData }
}: {
    params: SearchPageParams
}): Promise<Metadata> {
    try {
        const shop = await ShopApi({ domain });
        const locale = Locale.from(localeData);
        if (!locale) return notFoundMetadata;

        const api = await ShopifyApolloApiClient({ shop, locale });
        const store = await StoreApi({ api });
        const locales = await LocalesApi({ api });
        const { page } = await PageApi({ shop, locale, handle: 'search', type: 'custom_page' });
        const i18n = await getDictionary(locale);
        const { t } = useTranslation('common', i18n);

        const title = page?.meta_title || page?.title || t('search');
        const description = (page?.meta_description && asText(page.meta_description)) || page?.description || undefined;

        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domains.primary}/${locale.code}/search/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domains.primary}/${code}/search/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/search/`,
                type: 'website',
                title,
                description,
                siteName: store?.name,
                locale: locale.code,
                images:
                    (page?.meta_image && [
                        {
                            url: page?.meta_image!.url as string,
                            width: page?.meta_image!.dimensions?.width || 0,
                            height: page?.meta_image!.dimensions?.height || 0,
                            alt: page?.meta_image!.alt || '',
                            secureUrl: page?.meta_image!.url as string
                        }
                    ]) ||
                    undefined
            }
        };
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFoundMetadata;
        }

        throw error;
    }
}
/* c8 ignore stop */

export default async function SearchPage({
    params: { domain, locale: localeData },
    searchParams
}: {
    params: SearchPageParams,
    searchParams?: {
        q?: string;
    }
}) {
    try {
        const shop = await ShopApi({ domain });
        const locale = Locale.from(localeData);
        if (!locale) return notFound();
        const i18n = await getDictionary(locale);

        const api = await ShopifyApolloApiClient({ shop, locale });
        const store = await StoreApi({ api });

        const { page } = await PageApi({ shop, locale, handle: 'search', type: 'custom_page' });
        const prefetch = await Prefetch({ api, page });

        const query = searchParams?.q || '';

        return (
            <Page>
                <PageContent primary>
                    <Heading title={page?.title} subtitle={page?.description} />

                    {page?.slices && page?.slices.length > 0 && (
                        <PrismicPage
                            shop={shop}
                            store={store}
                            locale={locale}
                            page={page}
                            prefetch={prefetch}
                            i18n={i18n}
                            handle={'search'}
                            type={'custom_page'}
                        />
                    )}

                    <Suspense key={query}>
                        <SearchContent shop={shop} locale={locale} query={query} />
                    </Suspense>
                </PageContent>
            </Page>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}
