import { ShopApi } from '@/api/shop';
import { getServerSideSitemapIndex } from 'next-sitemap';
import type { NextRequest } from 'next/server';

/* c8 ignore start */
export type DynamicSitemapRouteParams = {
    domain: string;
};
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await ShopApi({ domain });
    const href = `https://${shop.domains.primary}/sitemap`;

    return getServerSideSitemapIndex([
        `${href}-pages.xml`,
        `${href}-products.xml`,
        `${href}-collections.xml`,
        `${href}-blogs.xml`
    ]);
}
/* c8 ignore stop */
