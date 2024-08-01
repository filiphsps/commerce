import { ShopApi } from '@nordcom/commerce-database';

import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import { unstable_cache as cache } from 'next/cache';
import { getServerSideSitemapIndex } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../sitemap.xml/route';
import type { NextRequest } from 'next/server';

export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await ShopApi(domain, cache, true);
    const locale = Locale.default;
    const apiConfig = await ShopifyApiConfig({ shop, noHeaders: true });
    const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });
    const locales = await LocalesApi({ api });

    return getServerSideSitemapIndex(
        locales.map(({ country }) => `https://${shop.domain}/sitemaps/${country!.toLowerCase()}/products.xml`)
    );
}
