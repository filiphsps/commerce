import { getServerSideSitemapIndex } from 'next-sitemap';
import { unstable_cache as cache } from 'next/cache';

import { ShopApi } from '@nordcom/commerce-database';

import type { NextRequest } from 'next/server';

export type DynamicSitemapRouteParams = {
    domain: string;
};
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await ShopApi(domain, cache);
    const href = `https://${shop.domain}/sitemaps`;

    return getServerSideSitemapIndex([
        `${href}/pages.xml`,
        `${href}/products.xml`,
        `${href}/collections.xml`,
        `${href}/blogs.xml`
    ]);
}
