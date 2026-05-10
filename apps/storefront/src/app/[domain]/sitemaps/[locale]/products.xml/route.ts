import { Shop } from '@nordcom/commerce-db';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { ProductsPaginationApi } from '@/api/shopify/product';
import { Locale } from '@/utils/locale';
import type { DynamicSitemapRouteParams } from '../../../sitemap.xml/route';

export type ProductsSitemapRouteParams = {
    params: Promise<
        Awaited<DynamicSitemapRouteParams> & {
            locale: string;
        }
    >;
};
export async function GET({}: NextRequest, { params }: ProductsSitemapRouteParams) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!localeData) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const api = await ShopifyApolloApiClient({ shop, locale });

    let res: Awaited<ReturnType<typeof ProductsPaginationApi>> | null = null;
    const products: Product[] = [];

    while (true) {
        res = await ProductsPaginationApi({ api, filters: { limit: 75, after: res?.page_info.end_cursor } });
        if (!res) break;

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
                    trailingSlash: true,
                }) as ISitemapField,
        ),
    );
}
