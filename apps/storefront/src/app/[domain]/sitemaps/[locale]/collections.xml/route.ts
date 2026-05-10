import { Shop } from '@nordcom/commerce-db';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionsPaginationApi } from '@/api/shopify/collection';
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
    const api = await ShopifyApolloApiClient({ shop, locale });

    let res: Awaited<ReturnType<typeof CollectionsPaginationApi>> | null = null;
    const collections: Collection[] = [];

    while (true) {
        res = await CollectionsPaginationApi({ api, filters: { limit: 75, after: res?.page_info.end_cursor } });
        if (!res) break;

        collections.push(...res.collections.map(({ node: product }) => product));
        if (!res.page_info.has_next_page) {
            break;
        }
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
