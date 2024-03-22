import { getServerSideSitemapIndex } from 'next-sitemap';

import { ShopApi } from '@nordcom/commerce-database';

import type { NextRequest } from 'next/server';

export type DynamicSitemapRouteParams = {
    domain: string;
};
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await ShopApi(domain);
    const href = `https://${shop.domain}/sitemap`;

    return getServerSideSitemapIndex([
        `${href}-pages.xml`,
        `${href}-products.xml`,
        `${href}-collections.xml`,
        `${href}-blogs.xml`
    ]);
}
