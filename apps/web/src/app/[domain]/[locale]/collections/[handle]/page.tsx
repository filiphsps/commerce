import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi, CollectionPaginationCountApi } from '@/api/shopify/collection';
import { LocalesApi } from '@/api/store';
import Pagination from '@/components/actionable/pagination';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import CollectionBlock from '@/components/products/collection-block';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { ShopApi } from '@nordcom/commerce-database';
import { Error } from '@nordcom/commerce-errors';
import { asText } from '@prismicio/client';
import type { Metadata } from 'next';
import { unstable_cache as cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { Fragment, Suspense } from 'react';
import styles from './page.module.scss';

// Make sure this page is always dynamic.
// TODO: Figure out a better way to deal with query params.
/*export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;*/

type FilterParams = {
    page?: string;
};

export type CollectionPageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle },
    searchParams
}: {
    params: CollectionPageParams;
    searchParams: FilterParams;
}): Promise<Metadata> {
    try {
        if (!isValidHandle(handle)) notFound();

        const locale = Locale.from(localeData);
        if (!locale) notFound();

        const shop = await ShopApi(domain, cache);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const collection = await CollectionApi({ api, handle, first: 16, after: null }); // TODO: this.
        const { page } = await PageApi({ shop, locale, handle, type: 'collection_page' });
        const locales = await LocalesApi({ api });

        // TODO: i18n.
        const title = `${page?.meta_title || collection.seo?.title || collection.title}${searchParams.page ? ` -  Page ${searchParams.page}` : ''}`;
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
        if (!locale) notFound();
        else if (searchParams.page && isNaN(parseInt(searchParams.page))) notFound();

        const productsPerPage = 16; // TODO: Make this configurable.
        const query = {
            page: searchParams.page ? Number.parseInt(searchParams.page) : 1
        };

        // Fetch the current shop.
        const shop = await ShopApi(domain, cache);

        const api = await ShopifyApolloApiClient({ shop, locale });

        // Pagination.
        const pagesInfo = await CollectionPaginationCountApi({ api, handle, first: productsPerPage });
        const after = pagesInfo.cursors[query.page - 2];

        // Do the actual API calls.
        const collection = await CollectionApi({ api, handle, first: productsPerPage, after });
        const { page } = await PageApi({ shop, locale, handle, type: 'collection_page' });

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary(locale);

        const subtitle =
            (page?.meta_description && asText(page?.meta_description)) || collection.seo?.description || null;

        return (
            <PageContent primary={true} className={styles.container}>
                <Heading
                    title={page?.meta_title || collection?.seo?.title || collection.title}
                    subtitleAs={Fragment}
                    subtitle={
                        subtitle ? (
                            <Content
                                dangerouslySetInnerHTML={{
                                    __html: subtitle
                                }}
                            />
                        ) : null
                    }
                />

                <section className={styles.collection}>
                    <Suspense
                        key={`${shop.id}.collection.${handle}.${JSON.stringify(searchParams, null, 0)}.${page}`}
                        fallback={<CollectionBlock.skeleton />}
                    >
                        <CollectionBlock
                            shop={shop}
                            locale={locale}
                            handle={handle}
                            filters={{
                                first: productsPerPage,
                                after
                            }}
                        />
                    </Suspense>

                    <Pagination knownFirstPage={1} knownLastPage={pagesInfo.pages} />
                </section>

                {page?.slices && (page?.slices?.length || 0) > 0 ? (
                    <PrismicPage
                        shop={shop}
                        locale={locale}
                        page={{
                            ...page,
                            slices: page.slices.filter(
                                ({ slice_type, variation }) =>
                                    !(slice_type === 'collection' && (variation as any) === 'full') // Filter any left-over legacy collection slices.
                            ) as any
                        }}
                        i18n={i18n}
                        handle={handle}
                        type={'collection_page'}
                    />
                ) : null}

                {collection.descriptionHtml ? (
                    <>
                        <hr />
                        <section>
                            <Content
                                dangerouslySetInnerHTML={{
                                    __html: collection.descriptionHtml
                                }}
                            />
                        </section>
                    </>
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
