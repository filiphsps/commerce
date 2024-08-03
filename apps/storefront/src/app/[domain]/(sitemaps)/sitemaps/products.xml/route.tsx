import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import { getServerSideSitemapIndex } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../sitemap.xml/route';
import type { NextRequest } from 'next/server';

export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await findShopByDomainOverHttp(domain);
    const locale = Locale.default;
    const apiConfig = await ShopifyApiConfig({ shop });
    const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });
    const locales = await LocalesApi({ api });

    return getServerSideSitemapIndex(
        locales.map(({ country }) => `https://${shop.domain}/sitemaps/${country!.toLowerCase()}/products.xml`)
    );
}
