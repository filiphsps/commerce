import { Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';

import { PageApi } from '@/api/prismic/page';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi, CollectionPaginationCountApi, CollectionsApi } from '@/api/shopify/collection';
import { LocalesApi } from '@/api/store';
import { isValidHandle } from '@/utils/handle';
import { Locale } from '@/utils/locale';
import { checkAndHandleRedirect } from '@/utils/redirect';
import { asText } from '@prismicio/client';
import { notFound, unstable_rethrow } from 'next/navigation';

import { Pagination } from '@/components/actionable/pagination';
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
    params: { domain, locale: localeData, handle }
}: {
    params: CollectionPageParams;
}): Promise<Metadata> {
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    let collection: Awaited<ReturnType<typeof CollectionApi>>, page: Awaited<ReturnType<typeof PageApi>>;

    try {
        // Do the actual API calls.
        collection = await CollectionApi({ api, handle, limit: 1 });
        page = await PageApi({ shop, locale, handle, type: 'collection_page' });
    } catch (error: unknown) {
        unstable_rethrow(error);

        if (Error.isNotFound(error)) {
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/collections/${handle}` });
            notFound();
        }

        console.error(error);
        throw error;
    }

    const locales = await LocalesApi({ api });

    // TODO: i18n.
    const title = page?.meta_title || collection.seo.title || collection.title;
    const description: string | undefined =
        asText(page?.meta_description) ||
        collection.seo.description ||
        collection.description.substring(0, 150) ||
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
        unstable_rethrow(error);

        if (Error.isNotFound(error)) {
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/collections/${handle}` });
            notFound();
        }

        console.error(error);
        throw error;
    }

    const page = await PageApi({ shop, locale, handle, type: 'collection_page' });

    const empty = collection.products.edges.length <= 0;

    const jsonLd: WithContext<Collection> = {
        '@context': 'https://schema.org',
        '@type': 'Collection',
        'name': collection.title,
        'description': collection.description,
        'url': `https://${shop.domain}/${locale.code}/collections/${handle}/`
    };

    const pageContent = (
        <>
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
                                pagesInfo={pagesInfo}
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
            <Content html={collection.descriptionHtml} />
        </>
    );

    return (
        <>
            <Suspense key={`collections.${handle}.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.5rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={collection.title} />
                </div>
            </Suspense>

            {!page || page.slices.length <= 0 ? (
                pageContent
            ) : (
                <>
                    {!page.slices.some((slice) => slice.slice_type === 'original_content') ? pageContent : null}

                    <PrismicPage
                        shop={shop}
                        locale={locale}
                        pageContent={pageContent}
                        page={page}
                        handle={handle}
                        type={'collection_page'}
                    />
                </>
            )}

            {/* Metadata */}
            <JsonLd data={jsonLd} />
        </>
    );
}
