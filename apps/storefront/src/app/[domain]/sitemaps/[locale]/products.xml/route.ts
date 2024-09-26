import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductsPaginationApi } from '@/api/shopify/product';
import { Locale } from '@/utils/locale';
import { notFound } from 'next/navigation';
import { getServerSideSitemap } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../../sitemap.xml/route';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';

export const dynamic = 'force-static';
export const revalidate = false;

export type ProductsSitemapRouteParams = {
    params: Promise<
        Awaited<DynamicSitemapRouteParams> & {
            locale: string;
        }
    >;
};
export async function GET({}: NextRequest, { params }: ProductsSitemapRouteParams) {
    const { domain, locale: localeData } = await params;
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
            ({ handle, updatedAt }) =>
                ({
                    loc: `https://${shop.domain}/${locale.code}/products/${handle}/`,
                    changefreq: 'weekly',
                    lastmod: updatedAt,
                    alternateRefs: [],
                    trailingSlash: true
                }) as ISitemapField
        )
    );
}
