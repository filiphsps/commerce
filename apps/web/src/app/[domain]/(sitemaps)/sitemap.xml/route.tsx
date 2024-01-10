import { ShopApi } from '@nordcom/commerce-database';
import { getServerSideSitemapIndex } from 'next-sitemap';
import type { NextRequest } from 'next/server';

/* c8 ignore start */
export type DynamicSitemapRouteParams = {
    domain: string;
};
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await ShopApi(domain, true);
    const href = `https://${shop.domain}/sitemap`;

    return getServerSideSitemapIndex([
        `${href}-pages.xml`,
        `${href}-products.xml`,
        `${href}-collections.xml`,
        `${href}-blogs.xml`
    ]);
}
/* c8 ignore stop */
