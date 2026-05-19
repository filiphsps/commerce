import { Shop } from '@nordcom/commerce-db';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionsPaginationApi } from '@/api/shopify/collection';
import { cache } from '@/cache';
import { Locale } from '@/utils/locale';
import type { DynamicSitemapRouteParams } from '../../../sitemap.xml/route';

export type CollectionsSitemapRouteParams = {
    params: Promise<
        Awaited<DynamicSitemapRouteParams> & {
            locale: string;
        }
    >;
};
export async function GET({}: NextRequest, { params }: CollectionsSitemapRouteParams) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!localeData) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    cacheTag(...cache.keys.collections({ tenant: shop }).tags);
    const api = await ShopifyApolloApiClient({ shop, locale });

    let res: Awaited<ReturnType<typeof CollectionsPaginationApi>> | null = null;
    const collections: Collection[] = [];

    // See products.xml for rationale — same caps so the route can't OOM on a
    // pathological shop.
    const MAX_PAGES = 200;
    const MAX_URLS = 50000;
    let page = 0;

    while (page < MAX_PAGES) {
        res = await CollectionsPaginationApi({ api, filters: { limit: 75, after: res?.page_info.end_cursor } });
        if (!res) break;

        collections.push(...res.collections.map(({ node: product }) => product));
        page += 1;
        if (!res.page_info.has_next_page || collections.length >= MAX_URLS) {
            break;
        }
    }
    if (collections.length >= MAX_URLS) {
        console.warn(
            `[sitemap/collections] capped at MAX_URLS=${MAX_URLS} for shop ${shop.domain} — split into sub-sitemaps when this becomes the norm.`,
        );
    }

    return getServerSideSitemap(
        collections.map(
            ({ handle, updatedAt }) =>
                ({
                    loc: `https://${shop.domain}/${locale.code}/collections/${handle}/`,
                    changefreq: 'daily',
                    lastmod: updatedAt,
                    alternateRefs: [],
                    trailingSlash: true,
                }) as ISitemapField,
        ),
    );
}
