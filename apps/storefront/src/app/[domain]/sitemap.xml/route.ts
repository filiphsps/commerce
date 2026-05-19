import { Shop } from '@nordcom/commerce-db';
import { cacheLife, cacheTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import { getServerSideSitemapIndex } from 'next-sitemap';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { tenantRootTags } from '@/cache';
import { Locale } from '@/utils/locale';

export type DynamicSitemapRouteParams = Promise<{
    domain: string;
}>;
export async function GET({}: NextRequest, { params }: { params: DynamicSitemapRouteParams }) {
    'use cache';
    cacheLife('max');

    const locale = Locale.default;

    const { domain } = await params;
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    // Tie the cached sitemap to the tenant's cache namespace so a domain
    // rename or locale change (which triggers a broad sweep on
    // `shopify.<shopId>`) busts the stale URLs. Without an explicit tag the
    // `cacheLife('max')` entry sticks around indefinitely.
    cacheTag(...tenantRootTags(shop));
    const api = await ShopifyApolloApiClient({ shop, locale });

    const locales = await LocalesApi({ api });

    const href = `https://${shop.domain}/sitemaps`;

    return getServerSideSitemapIndex([
        `${href}/pages.xml`,
        ...locales.flatMap(({ code }) => [
            `${href}/${code}/products.xml`,
            `${href}/${code}/collections.xml`,
            `${href}/${code}/blogs.xml`,
        ]),
    ]);
}
