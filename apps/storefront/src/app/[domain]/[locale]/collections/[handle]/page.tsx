import styles from './page.module.scss';

import { Suspense } from 'react';

import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi, CollectionPaginationCountApi } from '@/api/shopify/collection';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { asText } from '@prismicio/client';
import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';

import Pagination from '@/components/actionable/pagination';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import CollectionBlock from '@/components/products/collection-block';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';

import type { Metadata } from 'next';

// TODO: Figure out a better way to deal with query params.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// TODO: Make this dynamic, preferably a configurable default value and then a query param override.
const PRODUCTS_PER_PAGE = 16 as const;

type FilterParams = {
    page?: string;
};

export type CollectionPageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle },
    searchParams: { page: pageParam }
}: {
    params: CollectionPageParams;
    searchParams: FilterParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) notFound();

        const locale = Locale.from(localeData);

        const shop = await ShopApi(domain, cache);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const collection = await CollectionApi({ api, handle, first: 16, after: null }, cache); // TODO: this.
        const page = await PageApi({ shop, locale, handle, type: 'collection_page' });
        const locales = await LocalesApi({ api });

        // TODO: i18n.
        const title = `${page?.meta_title || collection.seo.title || collection.title}${pageParam ? ` -  Page ${pageParam}` : ''}`;
        const description: string | undefined =
            asText(page?.meta_description) ||
            collection.seo.description ||
            collection.description.substring(0, 150) ||
            undefined;
        return {
            title,
            description,
            robots: {
                index: pageParam && Number.parseInt(pageParam) > 1 ? false : true
            },
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

export default async function CollectionPage({
    params: { domain, locale: localeData, handle },
    searchParams
}: {
    params: CollectionPageParams;
    searchParams: FilterParams;
}) {
    try {
        if (!isValidHandle(handle)) notFound();

        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeData);

        if (searchParams.page && isNaN(parseInt(searchParams.page))) notFound();
        const query = {
            page: searchParams.page ? Number.parseInt(searchParams.page) : 1
        };

        // Fetch the current shop.
        const shop = await ShopApi(domain, cache);

        // Setup the AbstractApi client.
        const api = await ShopifyApolloApiClient({ shop, locale });

        // Deal with pagination before fetching the collection.
        const pagesInfo = await CollectionPaginationCountApi({ api, handle, filters: { first: PRODUCTS_PER_PAGE } });
        const after = pagesInfo.cursors[query.page - 2];

        // Do the actual API calls.
        const collection = await CollectionApi({ api, handle, filters: { first: PRODUCTS_PER_PAGE, after } }, cache);
        const page = await PageApi({ shop, locale, handle, type: 'collection_page' });

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary(locale);

        const subtitle = asText(page?.meta_description) || collection.seo.description || null;

        // Filter any left-over legacy collection slices.
        const slices =
            page?.slices.filter(
                ({ slice_type, variation }) => !(slice_type === 'collection' && (variation as any) === 'full')
            ) || [];

        return (
            <>
                <Breadcrumbs shop={shop} title={collection.title} />

                <PageContent className={styles.container}>
                    <Heading
                        title={page?.meta_title || collection.seo.title || collection.title}
                        subtitleAs={null}
                        subtitle={subtitle ? <Content dangerouslySetInnerHTML={{ __html: subtitle }} /> : null}
                    />

                    <section className={styles.collection}>
                        <Suspense fallback={<CollectionBlock.skeleton />}>
                            <CollectionBlock
                                shop={shop}
                                locale={locale}
                                handle={handle}
                                filters={{ first: PRODUCTS_PER_PAGE, after }}
                            />
                        </Suspense>
                    </section>

                    <section className={styles.collection}>
                        <Suspense fallback={null}>
                            <Pagination knownFirstPage={1} knownLastPage={pagesInfo.pages} />
                        </Suspense>
                    </section>

                    <section className={styles.content}>
                        {page && slices && (slices.length || 0) > 0 ? (
                            <PrismicPage
                                shop={shop}
                                locale={locale}
                                page={{ ...page, slices } as any}
                                i18n={i18n}
                                handle={handle}
                                type={'collection_page'}
                            />
                        ) : null}
                    </section>

                    {collection.descriptionHtml ? (
                        <section>
                            <Content dangerouslySetInnerHTML={{ __html: collection.descriptionHtml }} />
                        </section>
                    ) : null}
                </PageContent>

                {/* Metadata */}
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'CollectionPage',
                            'name': collection.title,
                            'description': collection.description,
                            'url': `https://${shop.domain}/${locale.code}/collections/${handle}/`
                        })
                    }}
                />
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
