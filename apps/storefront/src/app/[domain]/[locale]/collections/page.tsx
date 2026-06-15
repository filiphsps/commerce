import { Library as CollectionsIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { Suspense } from 'react';
import { LocalesApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionsPaginationApi } from '@/api/shopify/collection';
import { Button } from '@/components/actionable/button';
import { EmptyState } from '@/components/empty-state';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import { BreadcrumbsSkeleton } from '@/components/informational/breadcrumbs.skeleton';
import Link from '@/components/link';
import PageContent from '@/components/page-content';
import Heading from '@/components/typography/heading';
import { getDictionary } from '@/i18n/dictionary';
import { capitalize, getTranslations, Locale } from '@/utils/locale';
import { CollectionCard, type CollectionCardData } from './collection-card';

export type CollectionsIndexParams = Promise<{ domain: string; locale: string }>;

/**
 * Builds metadata for the collections index.
 *
 * @param domain - Tenant hostname.
 * @param localeData - Active locale code.
 * @returns The page metadata with localized title and alternates.
 */
async function buildMetadata(domain: string, localeData: string): Promise<Metadata> {
    'use cache';
    cacheLife('days');

    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [locales, i18n] = await Promise.all([LocalesApi({ api }), getDictionary(locale)]);
    const { t } = getTranslations('common', i18n);
    const title = capitalize(t('collections'));

    return {
        title,
        alternates: {
            canonical: `https://${shop.domain}/${locale.code}/collections/`,
            languages: Object.fromEntries(
                locales.map(({ code }) => [code, `https://${shop.domain}/${code}/collections/`]),
            ),
        },
        openGraph: {
            url: `/collections/`,
            type: 'website',
            title,
            siteName: shop.name,
            locale: locale.code,
        },
    };
}

export async function generateMetadata({ params }: { params: CollectionsIndexParams }): Promise<Metadata> {
    const { domain, locale } = await params;
    return buildMetadata(domain, locale);
}

/**
 * Collections index route. Previously missing (a bare `/collections` request 404'd); this lists every
 * collection the storefront exposes as a grid of {@link CollectionCard} tiles, falling back to a
 * browse-all empty state when a tenant has no collections.
 *
 * @param props.params - Route params resolving the tenant and locale.
 * @returns The collections index page.
 */
export default async function CollectionsIndexPage({ params }: { params: CollectionsIndexParams }) {
    'use cache';
    cacheLife('days');

    const { domain, locale: localeData } = await params;
    const locale = Locale.from(localeData);
    const shop = await Shop.findByDomain(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });
    const i18n = await getDictionary(locale);
    const { t } = getTranslations('common', i18n);
    const title = capitalize(t('collections'));

    let collections: CollectionCardData[] = [];
    try {
        const { collections: edges } = await CollectionsPaginationApi({ api, filters: { first: 100 } });
        // The list query is `unsafe_cast` at the API boundary; a node missing its handle/title is
        // skipped here rather than rendered into a dead tile.
        collections = edges
            .map((edge) => edge.node)
            .filter((node): node is NonNullable<typeof node> => Boolean(node?.handle && node?.title))
            .map((node) => ({ handle: node.handle, title: node.title, image: node.image ?? null }));
    } catch {
        collections = [];
    }

    return (
        <>
            <Suspense key="collections.breadcrumbs" fallback={<BreadcrumbsSkeleton />}>
                <div className="-mb-5 empty:hidden md:-mb-9">
                    <Breadcrumbs locale={locale} title={title} />
                </div>
            </Suspense>

            <PageContent>
                <Heading title={title} />
                {collections.length > 0 ? (
                    <div className="grid w-full gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(16rem,100%),1fr))]">
                        {collections.map((collection, index) => (
                            <CollectionCard key={collection.handle} collection={collection} priority={index < 4} />
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={<CollectionsIcon aria-hidden={true} />}
                        title={title}
                        action={
                            <Button as={Link} href="/products/">
                                {t('browse-all-products')}
                            </Button>
                        }
                    />
                )}
            </PageContent>
        </>
    );
}
