import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductsPaginationApi } from '@/api/shopify/product';
import { Locale } from '@/utils/locale';
import { getServerSideSitemap } from 'next-sitemap';
import { notFound } from 'next/navigation';

import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import type { ISitemapField } from 'next-sitemap';
import type { NextRequest } from 'next/server';
import type { DynamicSitemapRouteParams } from '../../../sitemap.xml/route';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(
    _: NextRequest,
    { params: { domain, locale: localeData } }: { params: DynamicSitemapRouteParams & { locale: string } }
) {
    if (!localeData) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await findShopByDomainOverHttp(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    let res: Awaited<ReturnType<typeof ProductsPaginationApi>> | null = null;
    let products: Product[] = [];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while ((res = await ProductsPaginationApi({ api, filters: { limit: 75, after: res?.page_info.end_cursor } }))) {
        products.push(...res.products.map(({ node: product }) => product));
        if (!res.page_info.has_next_page) {
            break;
        }
    }

    return getServerSideSitemap(
        products.map(
            (product) =>
                ({
                    loc: `https://${shop.domain}/${locale.code}/products/${product.handle}/`,
                    changefreq: 'daily',
                    lastmod: product.updatedAt,
                    alternateRefs: [],
                    trailingSlash: true
                }) as ISitemapField
        )
    );
}
