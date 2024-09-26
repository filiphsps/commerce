import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import { getServerSideSitemapIndex } from 'next-sitemap';

import type { NextRequest } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

export type DynamicSitemapRouteParams = Promise<{
    domain: string;
}>;
export async function GET({}: NextRequest, { params }: { params: DynamicSitemapRouteParams }) {
    const locale = Locale.default;

    const { domain } = await params;
    const shop = await findShopByDomainOverHttp(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const locales = await LocalesApi({ api });

    const href = `https://${shop.domain}/sitemaps`;

    return getServerSideSitemapIndex([
        `${href}/pages.xml`,
        ...locales.flatMap(({ code }) => [
            `${href}/${code}/products.xml`,
            `${href}/${code}/collections.xml`,
            `${href}/${code}/blogs.xml`
        ])
    ]);
}
