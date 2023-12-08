import { CollectionApi, CollectionsApi } from '@/api/shopify/collection';
import { Locale } from '@/utils/locale';
import { PageApi } from '@/api/page';
import { ShopApi, ShopsApi } from '@/api/shop';
import { ShopifyApolloApiClient, StorefrontApiClient } from '@/api/shopify';
import { LocalesApi, StoreApi } from '@/api/store';
import { Page } from '@/components/layout/page';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import { CollectionBlock, CollectionBlockSkeleton } from '@/components/products/collection-block';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { BuildConfig } from '@/utils/build-config';
import { Error } from '@/utils/errors';
import { isValidHandle } from '@/utils/handle';
import { Prefetch } from '@/utils/prefetch';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { metadata as notFoundMetadata } from '../../not-found';

/* c8 ignore start */
export const revalidate = 28_800; // 8hrs.
export const dynamicParams = true;
export async function generateStaticParams() {
    const locale = Locale.default;
    const shops = await ShopsApi();

    const pages = (
        await Promise.all(
            shops
                .map(async (shop) => {
                    try {
                        const api = await StorefrontApiClient({ shop, locale });
                        const locales = await LocalesApi({ api });

                        return await Promise.all(
                            locales
                                .map(async (locale) => {
                                    try {
                                        const api = await StorefrontApiClient({ shop, locale });
                                        const collections = await CollectionsApi({ client: api });

                                        return collections
                                            .filter(({ hasProducts }) => hasProducts)
                                            .map(({ handle }) => ({
                                                domain: shop.domains.primary,
                                                locale: locale.code,
                                                handle
                                            }));
                                    } catch {
                                        return null;
                                    }
                                })
                                .filter((_) => _)
                        );
                    } catch {
                        return null;
                    }
                })
                .filter((_) => _)
        )
    ).flat(2);

    // FIXME: We have already looped through all pages when we get here which is really inefficient.
    if (BuildConfig.build.limit_pages) {
        return pages.slice(0, BuildConfig.build.limit_pages);
    }

    return pages;
}
/* c8 ignore stop */

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

        const locale = Locale.from(localeData);
        if (!locale) return notFoundMetadata;

        const api = await ShopifyApolloApiClient({ shop, locale });
        const store = await StoreApi({ api });
        const collection = await CollectionApi({ api, handle });
        const { page } = await PageApi({ shop, locale, handle, type: 'collection_page' });
        const locales = store.i18n?.locales || [Locale.default];

        const title = page?.meta_title || collection.seo?.title || collection.title;
        const description: string | undefined =
            (page?.meta_description && asText(page.meta_description)) ||
            collection.seo.description ||
            collection.description?.substring(0, 150) ||
            undefined;
        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domains.primary}/${locale.code}/collections/${handle}/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domains.primary}/${code}/collections/${handle}/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/collections/${handle}/`,
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

export default async function CollectionPage({
    params: { domain, locale: localeData, handle }
}: {
    params: CollectionPageParams;
}) {
    try {
        const shop = await ShopApi({ domain });
        if (!isValidHandle(handle)) return notFound();

        const locale = Locale.from(localeData);
        if (!locale) return notFound();

        const i18n = await getDictionary(locale);
        const api = await StorefrontApiClient({ shop, locale });
        const store = await StoreApi({ api });
        const collection = await CollectionApi({ api, handle });

        const { page } = await PageApi({ shop, locale, handle, type: 'collection_page' });
        const prefetch = await Prefetch({
            api,
            page
        });

        return (
            <Page>
                <PageContent primary>
                    {!page || page.enable_header === undefined || page.enable_header ? (
                        <div>
                            <Heading title={collection.title} subtitle={null} />
                        </div>
                    ) : null}

                    {!page || page.enable_collection === undefined || page.enable_collection ? (
                        <>
                            <Suspense fallback={<CollectionBlockSkeleton />}>
                                <CollectionBlock
                                    data={collection as any}
                                    store={store}
                                    locale={locale}
                                    i18n={i18n}
                                    // TODO: Pagination.
                                    limit={250}
                                />
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
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            return notFound();
        }

        throw error;
    }
}
