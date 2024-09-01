import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi, CollectionPaginationCountApi } from '@/api/shopify/collection';
import { LocalesApi } from '@/api/store';
import { getDictionary } from '@/i18n/dictionary';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { asText } from '@prismicio/client';
import { notFound } from 'next/navigation';

import Pagination from '@/components/actionable/pagination';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';
import CollectionBlock from '@/components/products/collection-block';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';

import { CollectionContent, PRODUCTS_PER_PAGE } from './collection-content';

import type { LocaleDictionary } from '@/utils/locale';
import type { Metadata } from 'next';
import type { Collection, WithContext } from 'schema-dts';

// TODO: Figure out a better way to deal with query params.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type CollectionPageParams = { domain: string; locale: string; handle: string };
export async function generateMetadata({
    params: { domain, locale: localeData, handle },
    searchParams
}: {
    params: CollectionPageParams;
    searchParams: { [key: string]: string | string[] | undefined };
}): Promise<Metadata> {
    if (!isValidHandle(handle)) {
        notFound();
    }

    try {
        const locale = Locale.from(localeData);

        const shop = await Shop.findByDomain(domain, { sensitiveData: true });
        const api = await ShopifyApolloApiClient({ shop, locale });

        const collection = await CollectionApi({ api, handle, first: 1, after: null }); // TODO: this.
        const page = await PageApi({ shop, locale, handle, type: 'collection_page' });
        const locales = await LocalesApi({ api });

        const currentPage = Number.parseInt(searchParams.page?.toString() || '1');
        const search = currentPage > 1 ? `?page=${currentPage}` : '';

        // TODO: i18n.
        const title = `${page?.meta_title || collection.seo.title || collection.title}${currentPage > 1 ? ` -  Page ${currentPage}` : ''}`;
        const description: string | undefined =
            asText(page?.meta_description) ||
            collection.seo.description ||
            collection.description.substring(0, 150) ||
            undefined;
        return {
            title,
            description,
            alternates: {
                canonical: `https://${shop.domain}/${locale.code}/collections/${handle}/${search}`,
                languages: locales.reduce(
                    (prev, { code }) => ({
                        ...prev,
                        [code]: `https://${shop.domain}/${code}/collections/${handle}/${search}`
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

        throw error;
    }
}

async function CollectionPageSlices({
    shop,
    locale,
    i18n,
    handle
}: {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    handle: string;
}) {
    const page = await PageApi({ shop, locale, handle, type: 'collection_page' });
    if (!page || page.slices.length <= 0) {
        return null;
    }

    return (
        <PageContent>
            <PrismicPage shop={shop} locale={locale} page={page} i18n={i18n} handle={handle} type={'collection_page'} />
        </PageContent>
    );
}

export default async function CollectionPage({
    params: { domain, locale: localeData, handle },
    searchParams
}: {
    params: CollectionPageParams;
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    if (!isValidHandle(handle)) {
        notFound();
    }

    try {
        // Creates a locale object from a locale code (e.g. `en-US`).
        const locale = Locale.from(localeData);

        // Fetch the current shop.
        const shop = await Shop.findByDomain(domain, { sensitiveData: true });

        // Setup the AbstractApi client.

        const api = await ShopifyApolloApiClient({ shop, locale });

        // Do the actual API calls.
        const [collection, pagesInfo] = await Promise.all([
            CollectionApi({ api, handle, limit: 0 }),
            CollectionPaginationCountApi({ api, handle, filters: { first: PRODUCTS_PER_PAGE } })
        ]);

        // Get dictionary of strings for the current locale.
        const i18n = await getDictionary(locale);

        const jsonLd: WithContext<Collection> = {
            '@context': 'https://schema.org',
            '@type': 'Collection',
            'name': collection.title,
            'description': collection.description,
            'url': `https://${shop.domain}/${locale.code}/collections/${handle}/`
        };

        return (
            <>
                <Suspense fallback={<BreadcrumbsSkeleton />}>
                    <Breadcrumbs locale={locale} title={collection.title} />
                </Suspense>

                <Heading title={collection.seo.title ?? collection.title} />

                <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
                    <Suspense
                        key={JSON.stringify(searchParams)}
                        fallback={<CollectionBlock.skeleton length={PRODUCTS_PER_PAGE} bare={true} />}
                    >
                        <CollectionContent
                            shop={shop}
                            locale={locale}
                            searchParams={searchParams}
                            handle={handle}
                            cursors={pagesInfo.cursors}
                        />
                    </Suspense>
                </div>

                <section className="flex w-full items-center justify-center">
                    <Suspense>
                        <Pagination knownFirstPage={1} knownLastPage={pagesInfo.pages} />
                    </Suspense>
                </section>

                <Suspense fallback={<section className="w-full bg-gray-100 p-4" data-skeleton />}>
                    <CollectionPageSlices shop={shop} locale={locale} i18n={i18n} handle={handle} />
                </Suspense>

                <Content html={collection.descriptionHtml} />

                {/* Metadata */}
                <JsonLd data={jsonLd} />
            </>
        );
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            notFound();
        }

        throw error;
    }
}
