import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import { getServerSideSitemapIndex } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../sitemap.xml/route';
import type { NextRequest } from 'next/server';

export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await findShopByDomainOverHttp(domain);
    const locale = Locale.default;
    const api = await ShopifyApolloApiClient({ shop, locale });
    const locales = await LocalesApi({ api });

    return getServerSideSitemapIndex(
        locales.map(({ country }) => `https://${shop.domain}/sitemaps/${country!.toLowerCase()}/products.xml`)
    );
}
