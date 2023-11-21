import { CollectionApi } from '@/api/shopify/collection';
import { NextLocaleToLocale } from '@/utils/locale';

import { PageApi } from '@/api/page';
import { ShopApi } from '@/api/shop';
import { StorefrontApiClient } from '@/api/shopify';
import { StoreApi } from '@/api/store';
import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import { CollectionBlock, CollectionBlockSkeleton } from '@/components/products/collection-block';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { metadata as notFoundMetadata } from '../../not-found';

/* c8 ignore start */
export type CollectionPageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: CollectionPageParams;
}): Promise<Metadata> {
    try {
        const shop = await ShopApi({ domain });
        if (!isValidHandle(handle)) return notFoundMetadata;

        const locale = NextLocaleToLocale(localeData);
        if (!locale) return notFoundMetadata;

        const api = StorefrontApiClient({ shop, locale });
        const store = await StoreApi({ shop, locale, api });
        const collection = await CollectionApi({ api, handle });
        const { page } = await PageApi({ shop, locale, handle, type: 'collection_page' });
        const locales = store.i18n.locales;

        const description: string | undefined =
            (page?.meta_description && asText(page.meta_description)) ||
            collection.seo.description ||
            collection.description?.substring(0, 150) ||
            undefined;
        return {
            title: page?.meta_title || collection.title,
            description,
            alternates: {
                canonical: `https://${domain}/${locale.locale}/collections/${handle}/`,
                languages: locales.reduce(
                    (prev, { locale }) => ({
                        ...prev,
                        [locale]: `https://${domain}/${locale}/collections/${handle}/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/collections/${handle}/`,
                type: 'website',
                title: page?.meta_title || collection.title,
                description,
                siteName: store?.name,
                locale: locale.locale,
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
    } catch (error: any) {
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFoundMetadata;
        }

        throw error;
    }
}
/* c8 ignore stop */

export default async function CollectionPage({
    params: { domain, locale: localeData, handle }
}: {
    params: CollectionPageParams;
}) {
    try {
        const shop = await ShopApi({ domain });
        if (!isValidHandle(handle)) return notFound();

        const locale = NextLocaleToLocale(localeData);
        if (!locale) return notFound();

        const i18n = await getDictionary(locale);
        const api = StorefrontApiClient({ shop, locale });
        const store = await StoreApi({ shop, locale, api });
        const collection = await CollectionApi({ api, handle });

        const { page } = await PageApi({ shop, locale, handle, type: 'collection_page' });
        const prefetch = await Prefetch({
            api,
            page
        });

        return (
            <Page>
                <PageContent primary>
                    {!page || page.enable_header ? (
                        <div>
                            <Heading title={collection.title} subtitle={null} />
                        </div>
                    ) : null}
                    {!page || page.enable_collection === undefined || page.enable_collection ? (
                        <>
                            <Suspense fallback={<CollectionBlockSkeleton />}>
                                <CollectionBlock data={collection as any} store={store} locale={locale} i18n={i18n} />
                            </Suspense>
                        </>
                    ) : null}

                    {page?.slices && page?.slices.length > 0 ? (
                        <PrismicPage
                            shop={shop}
                            store={store}
                            locale={locale}
                            page={page}
                            prefetch={prefetch}
                            i18n={i18n}
                            handle={handle}
                            type={'collection_page'}
                        />
                    ) : null}
                </PageContent>
            </Page>
        );
    } catch (error: any) {
        console.warn(error);
        const message = (error?.message as string) || '';
        if (message.startsWith('404:')) {
            return notFoundMetadata;
        }

        throw error;
    }
}

export const revalidate = 120;
