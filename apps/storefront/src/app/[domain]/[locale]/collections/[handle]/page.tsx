import { Shop } from '@nordcom/commerce-db';
import { Error } from '@nordcom/commerce-errors';
import { flattenConnection } from '@shopify/hydrogen-react';
import type { Metadata } from 'next';
import { notFound, RedirectType, redirect, unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';
import type { CollectionPage, WithContext } from 'schema-dts';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionApi, CollectionPaginationCountApi } from '@/api/shopify/collection';
import { LocalesApi } from '@/api/store';
import { Pagination } from '@/components/actionable/pagination';
import { CMSContent } from '@/components/cms/cms-content';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';
import PageContent from '@/components/page-content';
import CollectionBlock from '@/components/products/collection-block';
import Heading from '@/components/typography/heading';
import { ShopifyContent } from '@/components/typography/shopify-content';
import { getDictionary } from '@/utils/dictionary';
import { isValidHandle } from '@/utils/handle';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import { checkAndHandleRedirect } from '@/utils/redirect';
import { CollectionContent, PRODUCTS_PER_PAGE } from './collection-content';
import type { CollectionPageParams } from './static-params';

export { type CollectionPageParams, generateStaticParams } from './static-params';

type SearchParams = Promise<{
    page?: string;
}>;

export async function generateMetadata({
    params,
    searchParams: queryParams,
}: {
    params: CollectionPageParams;
    searchParams: SearchParams;
}): Promise<Metadata> {
    const searchParams = await queryParams;
    const pageNumber = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;

    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    let collection: Awaited<ReturnType<typeof CollectionApi>>;

    try {
        collection = await CollectionApi({ api, handle, limit: 8 });
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

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('common', i18n);

    const title =
        pageNumber > 1
            ? `${collection.title} - ${capitalize(t('page-n', pageNumber.toString()))}`
            : collection.seo.title || collection.title;
    const description: string | undefined =
        collection.seo.description || collection.description.substring(0, 150) || undefined;
    return {
        title,
        description,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/collections/${handle}/${pageNumber > 1 ? `?page=${pageNumber}` : ''}`,
            languages: Object.fromEntries(
                locales.map(({ code }) => [
                    code,
                    `https://${shop.domain}/${code}/collections/${handle}/${pageNumber > 1 ? `?page=${pageNumber}` : ''}`,
                ]),
            ),
        },
        openGraph: {
            url: `/collections/${handle}/`,
            type: 'website',
            title,
            description,
            siteName: shop.name,
            locale: locale.code,
        },
    };
}

export default async function CollectionsCollectionPage({
    params,
    searchParams: queryParams,
}: {
    params: CollectionPageParams;
    searchParams: SearchParams;
}) {
    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const searchParams = await queryParams;

    const locale = Locale.from(localeData);

    if (searchParams.page === '1') {
        const params = new URLSearchParams(searchParams);
        redirect(
            `/${locale.code}/collections/${handle}/${params.size > 0 ? '?' : ''}${params.toString()}`,
            RedirectType.replace,
        );
    }

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });

    const api = await ShopifyApolloApiClient({ shop, locale });

    let collection: Awaited<ReturnType<typeof CollectionApi>>,
        pagesInfo: Awaited<ReturnType<typeof CollectionPaginationCountApi>>;

    try {
        collection = await CollectionApi({ api, handle, limit: 8 });
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

    const empty = collection.products.edges.length <= 0;

    const jsonLd: WithContext<CollectionPage> = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: collection.title,
        description: collection.description,
        url: `https://${shop.domain}/${locale.code}/collections/${handle}/`,
        image: collection.image?.url || undefined,
        mainEntity: {
            '@type': 'ItemList',
            numberOfItems: pagesInfo.products,
            itemListElement: flattenConnection(collection.products).map(
                ({ handle, title, images, description, vendor }, index) => ({
                    '@type': 'ListItem',
                    position: index,
                    url: `https://${shop.domain}/${locale.code}/products/${handle}/`,
                    name: title,
                    description: description,
                    image: flattenConnection(images)[0]?.url || undefined,
                    brand: {
                        '@type': 'Brand',
                        name: vendor,
                    },
                }),
            ),
        },
    };

    const i18n = await getDictionary({ shop, locale });
    const pagination = (
        <section className="flex w-full items-center justify-center empty:hidden">
            <Suspense key={`collections.${handle}.pagination`} fallback={<div className="h-8 w-full" data-skeleton />}>
                <Pagination i18n={i18n} knownFirstPage={1} knownLastPage={pagesInfo.pages} />
            </Suspense>
        </section>
    );

    const pageNumber = searchParams.page ? parseInt(searchParams.page, 10) : 1;

    const pageContent = !empty ? (
        <PageContent>
            {pagination}

            <Suspense
                key={`collections.${handle}.content.page.${pageNumber}`}
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

            {pagination}
        </PageContent>
    ) : null;

    return (
        <>
            <Suspense key={`collections.${handle}.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-[1.25rem] empty:hidden md:-mb-[2.25rem]">
                    <Breadcrumbs locale={locale} title={collection.title} />
                </div>
            </Suspense>

            <Heading title={collection.title || collection.seo.title} />
            {collection.descriptionHtml ? (
                <ShopifyContent className="prose max-w-none" html={collection.descriptionHtml} />
            ) : collection.seo.description ? (
                <p className="prose max-w-none">{collection.seo.description}</p>
            ) : null}

            {pageContent}

            {pageNumber <= 1 ? (
                <Suspense
                    key={`collections.${handle}.cms`}
                    fallback={<div className="h-32 w-full" data-skeleton />}
                >
                    <CMSContent shop={shop} locale={locale} handle={handle} type={'collection_page'} />
                </Suspense>
            ) : null}

            <JsonLd data={jsonLd} />
        </>
    );
}
