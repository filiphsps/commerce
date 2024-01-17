import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi } from '@/api/shopify/collection';
import { LocalesApi } from '@/api/store';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import CollectionBlock from '@/components/products/collection-block';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import styles from './page.module.scss';

export type CollectionPageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle }
}: {
    params: CollectionPageParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) notFound();

        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const shop = await ShopApi(domain, unstable_cache);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const collection = await CollectionApi({ api, handle });
        const { page } = await PageApi({ shop, locale, handle, type: 'collection_page' });
        const locales = await LocalesApi({ api });

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
                canonical: `https://${shop.domain}/${locale.code}/collections/${handle}/`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}/collections/${handle}/`
                    }),
                    {}
                )
            },
            openGraph: {
                url: `/collections/${handle}/`,
                type: 'website',
                title,
                description,
                siteName: shop?.name,
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
            notFound();
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
        if (!isValidHandle(handle)) notFound();

        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeData);
        if (!locale) notFound();

        // Fetch the current shop.
        const shop = await ShopApi(domain, unstable_cache);

        // Do the actual API calls.
        const api = await ShopifyApolloApiClient({ shop, locale });
        const collection = await CollectionApi({ api, handle });
        const { page } = await PageApi({ shop, locale, handle, type: 'collection_page' });

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary(locale);

        return (
            <PageContent primary={true} className={styles.container}>
                {!page || page.enable_header === undefined || page.enable_header ? (
                    <div>
                        <Heading title={collection.title} subtitle={null} />
                    </div>
                ) : null}

                {!page || page.enable_collection === undefined || page.enable_collection ? (
                    <Suspense fallback={<CollectionBlock.skeleton />}>
                        <CollectionBlock
                            shop={shop}
                            locale={locale}
                            handle={handle}
                            // TODO: Pagination.
                            limit={250}
                        />
                    </Suspense>
                ) : null}

                {page?.slices && page?.slices.length > 0 ? (
                    <PrismicPage
                        shop={shop}
                        locale={locale}
                        page={page}
                        i18n={i18n}
                        handle={handle}
                        type={'collection_page'}
                    />
                ) : null}
            </PageContent>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}