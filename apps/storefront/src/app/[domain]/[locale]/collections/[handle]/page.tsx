import { Error } from '@nordcom/commerce-errors';
import { flattenConnection } from '@shopify/hydrogen-react';
import { PackageOpen as EmptyCollectionIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound, RedirectType, redirect, unstable_rethrow } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';
import type { CollectionPage, WithContext } from 'schema-dts';
import { CollectionApi, CollectionMetadataApi, LocalesApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionPaginationCountApi } from '@/api/shopify/collection';
import { Blocks } from '@/blocks/blocks';
import type { BlockNode } from '@/blocks/types';
import { Button } from '@/components/actionable/button';
import { Pagination } from '@/components/actionable/pagination';
import { CMSContent } from '@/components/cms/cms-content';
import { EmptyState } from '@/components/empty-state';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import { JsonLd } from '@/components/json-ld';
import Link from '@/components/link';
import PageContent from '@/components/page-content';
import CollectionBlock from '@/components/products/collection-block';
import Heading from '@/components/typography/heading';
import { ShopifyContent } from '@/components/typography/shopify-content';
import { getDictionary } from '@/utils/dictionary';
import { isValidHandle } from '@/utils/handle';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import { collectionPageSize } from '@/utils/page-size';
import { checkAndHandleRedirect } from '@/utils/redirect';
import { CollectionContent } from './collection-content';
import type { CollectionPageParams } from './static-params';

export { type CollectionPageParams, generateStaticParams } from './static-params';

type SearchParams = Promise<{
    page?: string;
}>;

async function buildMetadata(
    domain: string,
    localeData: string,
    handle: string,
    pageNumber: number,
): Promise<Metadata> {
    'use cache';
    cacheLife('days');

    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain);
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

        throw error;
    }

    const locales = await LocalesApi({ api });

    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('common', i18n);

    const cmsMeta = await CollectionMetadataApi({ shop, locale, handle });

    const cmsSeoImageUrl = (() => {
        const img = cmsMeta?.seo?.image;
        return img && typeof img === 'object' && 'url' in img ? (img.url ?? undefined) : undefined;
    })();

    const baseTitle = cmsMeta?.seo?.title || collection.seo.title || collection.title;
    const title = pageNumber > 1 ? `${baseTitle} - ${capitalize(t('page-n', pageNumber.toString()))}` : baseTitle;
    const description: string | undefined =
        cmsMeta?.seo?.description ||
        collection.seo.description ||
        collection.description.substring(0, 150) ||
        undefined;
    const index = cmsMeta?.seo?.noindex !== true;
    const keywords = cmsMeta?.seo?.keywords ?? undefined;

    return {
        title,
        description,
        keywords,
        robots: { index },
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
            images: cmsSeoImageUrl ? [{ url: cmsSeoImageUrl }] : undefined,
        },
    };
}

export async function generateMetadata({
    params,
    searchParams: queryParams,
}: {
    params: CollectionPageParams;
    searchParams: SearchParams;
}): Promise<Metadata> {
    const [{ domain, locale: localeData, handle }, searchParams] = await Promise.all([params, queryParams]);
    const pageNumber = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
    return buildMetadata(domain, localeData, handle, pageNumber);
}

export default async function CollectionsCollectionPage({
    params,
    searchParams,
}: {
    params: CollectionPageParams;
    searchParams: SearchParams;
}) {
    return (
        <CollectionShell params={params}>
            <CollectionDynamic params={params} searchParams={searchParams} />
        </CollectionShell>
    );
}

/**
 * Cached collection frame: breadcrumbs, title, description, the paginated grid
 * (passed as `children`), and trailing CMS blocks. When the collection holds no
 * products it renders the shared {@link EmptyState} with a browse-all action
 * instead of a bare heading, so an empty collection is never a dead end.
 *
 * @param props.params - Route params resolving the tenant, locale, and collection handle.
 * @param props.children - The dynamically-rendered, paginated product grid.
 * @returns The collection page frame, including the empty state when there are no products.
 * @throws Re-throws non-not-found Shopify errors; triggers `notFound()` for invalid handles and not-found collections.
 */
async function CollectionShell({ params, children }: { params: CollectionPageParams; children: ReactNode }) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData, handle } = await params;
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    let collection: Awaited<ReturnType<typeof CollectionApi>>,
        pagesInfo: Awaited<ReturnType<typeof CollectionPaginationCountApi>>;

    try {
        [collection, pagesInfo] = await Promise.all([
            CollectionApi({ api, handle, limit: 8 }),
            CollectionPaginationCountApi({ api, handle, filters: { first: collectionPageSize(shop) } }),
        ]);
    } catch (error: unknown) {
        unstable_rethrow(error);

        if (Error.isNotFound(error)) {
            await checkAndHandleRedirect({ domain, locale: Locale.from(localeData), path: `/collections/${handle}` });
            notFound();
        }

        throw error;
    }

    const cmsMeta = await CollectionMetadataApi({ shop, locale, handle });
    const i18n = await getDictionary({ shop, locale });
    const { t } = getTranslations('common', i18n);

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

    const pagination = (
        <section className="flex w-full items-center justify-center empty:hidden">
            <Suspense key={`collections.${handle}.pagination`} fallback={<div className="h-8 w-full" data-skeleton />}>
                <Pagination i18n={i18n} knownFirstPage={1} knownLastPage={pagesInfo.pages} />
            </Suspense>
        </section>
    );

    return (
        <>
            <Suspense key={`collections.${handle}.breadcrumbs`} fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-5 empty:hidden md:-mb-9">
                    <Breadcrumbs locale={locale} title={collection.title} />
                </div>
            </Suspense>

            <Heading title={collection.title || collection.seo.title} />
            {cmsMeta?.descriptionOverride ? (
                <Blocks
                    blocks={[{ blockType: 'rich-text', body: cmsMeta.descriptionOverride }] as BlockNode[]}
                    context={{ shop, locale }}
                />
            ) : null}
            {collection.descriptionHtml ? (
                <ShopifyContent className="prose max-w-none" html={collection.descriptionHtml} />
            ) : collection.seo.description ? (
                <p className="prose max-w-none">{collection.seo.description}</p>
            ) : null}

            {!empty ? (
                <PageContent>
                    {pagination}

                    <Suspense
                        key={`collections.${handle}.content`}
                        fallback={<CollectionBlock.skeleton length={collectionPageSize(shop)} />}
                    >
                        {children}
                    </Suspense>

                    {pagination}
                </PageContent>
            ) : (
                <PageContent>
                    <EmptyState
                        icon={<EmptyCollectionIcon aria-hidden="true" />}
                        title={t('empty-collection-title')}
                        description={t('empty-collection-description')}
                        action={
                            <Button as={Link} href="/">
                                {t('browse-all-products')}
                            </Button>
                        }
                    />
                </PageContent>
            )}

            <Suspense key={`collections.${handle}.cms`} fallback={<div className="h-32 w-full" data-skeleton />}>
                <CMSContent shop={shop} locale={locale} handle={handle} />
            </Suspense>

            {cmsMeta?.blocks && cmsMeta.blocks.length > 0 ? (
                <Blocks blocks={cmsMeta.blocks as BlockNode[]} context={{ shop, locale }} />
            ) : null}

            <JsonLd data={jsonLd} />
        </>
    );
}

async function CollectionDynamic({
    params,
    searchParams: queryParams,
}: {
    params: CollectionPageParams;
    searchParams: SearchParams;
}) {
    const [{ domain, locale: localeData, handle }, searchParams] = await Promise.all([params, queryParams]);
    if (!isValidHandle(handle)) {
        notFound();
    }

    const locale = Locale.from(localeData);

    if (searchParams.page === '1') {
        const urlParams = new URLSearchParams(searchParams);
        redirect(
            `/${locale.code}/collections/${handle}/${urlParams.size > 0 ? '?' : ''}${urlParams.toString()}`,
            RedirectType.replace,
        );
    }

    const shop = await Shop.findByDomain(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const pagesInfo = await CollectionPaginationCountApi({
        api,
        handle,
        filters: { first: collectionPageSize(shop) },
    });

    return (
        <CollectionContent
            shop={shop}
            locale={locale}
            searchParams={searchParams}
            handle={handle}
            pagesInfo={pagesInfo}
        />
    );
}
