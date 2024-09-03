import { NotFoundError } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductsPaginationApi } from '@/api/shopify/product';
import { Locale } from '@/utils/locale';
import { getServerSideSitemap } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../../sitemap.xml/route';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(
    _: NextRequest,
    { params: { domain, region: regionData } }: { params: DynamicSitemapRouteParams & { region: string } }
) {
    const region = regionData.split('-').at(-1)?.split('.').at(0);
    if (!region) {
        throw new NotFoundError(`"Region" with the handle "${regionData}"`);
    }

    const locale = Locale.from(`en-${region}`);

    const shop = await findShopByDomainOverHttp(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    let res: Awaited<ReturnType<typeof ProductsPaginationApi>> | null = null;
    let products: Product[] = [];

    while ((res = await ProductsPaginationApi({ api, limit: 75, after: res?.page_info.end_cursor }))) {
        products.push(...res.products.map(({ node: product }) => product));
        if (!res.page_info.has_next_page) break;
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
