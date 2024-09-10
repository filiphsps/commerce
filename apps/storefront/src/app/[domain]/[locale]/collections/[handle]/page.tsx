import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/page';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi, CollectionPaginationCountApi, CollectionsApi } from '@/api/shopify/collection';
import { LocalesApi } from '@/api/store';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { checkAndHandleRedirect } from '@/utils/redirect';
import { asText } from '@prismicio/client';
import { notFound, unstable_rethrow } from 'next/navigation';

import Pagination from '@/components/actionable/pagination';
import PrismicPage from '@/components/cms/prismic-page';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';
import PageContent from '@/components/page-content';
import CollectionBlock from '@/components/products/collection-block';
import { Content } from '@/components/typography/content';
import Heading from '@/components/typography/heading';

import { CollectionContent, PRODUCTS_PER_PAGE } from './collection-content';

import type { Metadata } from 'next';
import type { Collection, WithContext } from 'schema-dts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // TODO: Figure out a better way to deal with query params.
export const dynamicParams = true;
export const revalidate = false;

export type CollectionPageParams = { domain: string; locale: string; handle: string };

export async function generateStaticParams({
    params: { domain, locale: localeData }
}: {
    params: Omit<CollectionPageParams, 'handle'>;
}): Promise<Omit<CollectionPageParams, 'domain' | 'locale'>[]> {
    /** @note Limit pre-rendering when not in production. */
    if (process.env.VERCEL_ENV !== 'production') {
        return [];
    }

    try {
        const locale = Locale.from(localeData);

        const shop = await findShopByDomainOverHttp(domain);
        const api = await ShopifyApolloApiClient({ shop, locale });
        const collections = await CollectionsApi({ api });

        return collections.map(({ handle }) => ({
            handle
        }));
    } catch (error: unknown) {
        console.error(error);
        return [];
    }
}

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

        const [collection, page, locales] = await Promise.all([
            CollectionApi({ api, handle, limit: 1 }),
            PageApi({ shop, locale, handle, type: 'collection_page' }),
            LocalesApi({ api })
        ]);

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
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/collections/${handle}` });
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }
}

async function CollectionPageSlices({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const page = await PageApi({ shop, locale, handle, type: 'collection_page' });
    if (!page || page.slices.length <= 0) {
        return null;
    }

    return (
        <PageContent>
            <PrismicPage shop={shop} locale={locale} page={page} handle={handle} type={'collection_page'} />
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

    // Creates a locale object from a locale code (e.g. `en-US`).
    const locale = Locale.from(localeData);

    // Fetch the current shop.
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    // Setup the AbstractApi client.
    const api = await ShopifyApolloApiClient({ shop, locale });

    let collection: Awaited<ReturnType<typeof CollectionApi>>,
        pagesInfo: Awaited<ReturnType<typeof CollectionPaginationCountApi>>;

    try {
        // Do the actual API calls.
        collection = await CollectionApi({ api, handle, limit: 1 });
        pagesInfo = await CollectionPaginationCountApi({ api, handle, filters: { first: PRODUCTS_PER_PAGE } });
    } catch (error: unknown) {
        if (Error.isNotFound(error)) {
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/collections/${handle}` });
            notFound();
        }

        console.error(error);
        unstable_rethrow(error);
        throw error;
    }

    const empty = collection.products.edges.length <= 0;

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
                <div className="-mb-[1.5rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={collection.title} />
                </div>
            </Suspense>

            {!empty ? (
                <>
                    <section className="flex flex-col gap-2">
                        <Heading title={collection.seo.title ?? collection.title} />

                        <Suspense
                            key={JSON.stringify(searchParams)}
                            fallback={<CollectionBlock.skeleton length={PRODUCTS_PER_PAGE} />}
                        >
                            <CollectionContent
                                shop={shop}
                                locale={locale}
                                searchParams={searchParams}
                                handle={handle}
                                cursors={pagesInfo.cursors}
                            />
                        </Suspense>
                    </section>

                    <section className="flex w-full items-center justify-center">
                        <Suspense>
                            <Pagination knownFirstPage={1} knownLastPage={pagesInfo.pages} />
                        </Suspense>
                    </section>
                </>
            ) : null}

            <Suspense fallback={<section className="w-full bg-gray-100 p-4" data-skeleton />}>
                <CollectionPageSlices shop={shop} locale={locale} handle={handle} />
            </Suspense>

            <Content html={collection.descriptionHtml} />

            {/* Metadata */}
            <JsonLd data={jsonLd} />
        </>
    );
}
