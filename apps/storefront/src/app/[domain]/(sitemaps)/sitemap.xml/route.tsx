import { findShopByDomainOverHttp } from '@/api/shop';
import { getServerSideSitemapIndex } from 'next-sitemap';

import type { NextRequest } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = false;

export type DynamicSitemapRouteParams = {
    domain: string;
};
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await findShopByDomainOverHttp(domain);
    const href = `https://${shop.domain}/sitemaps`;

    return getServerSideSitemapIndex([
        `${href}/pages.xml`,
        `${href}/products.xml`,
        `${href}/collections.xml`,
        `${href}/blogs.xml`
    ]);
}
