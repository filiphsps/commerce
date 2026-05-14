import { Shop } from '@nordcom/commerce-db';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import { cacheLife, cacheTag } from 'next/cache';
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
    cacheTag(`shopify.${shop.id}`, `shopify.${shop.id}.products`);
    const api = await ShopifyApolloApiClient({ shop, locale });

    let res: Awaited<ReturnType<typeof ProductsPaginationApi>> | null = null;
    const products: Product[] = [];

    // Hard caps so a runaway shop (or a Shopify pagination bug) can't OOM the
    // serverless function. The sitemaps spec also caps a single sitemap at
    // 50,000 URLs — beyond that we'd need to split into sub-sitemaps anyway.
    // 75 per page * 200 pages = 15,000 products, well under the spec ceiling
    // and within the 1024MB function budget.
    const MAX_PAGES = 200;
    const MAX_URLS = 50000;
    let page = 0;

    while (page < MAX_PAGES) {
        res = await ProductsPaginationApi({ api, filters: { limit: 75, after: res?.page_info.end_cursor } });
        if (!res) break;

        products.push(...res.products.map(({ node: product }) => product));
        page += 1;
        if (!res.page_info.has_next_page || products.length >= MAX_URLS) {
            break;
        }
    }
    if (products.length >= MAX_URLS) {
        console.warn(
            `[sitemap/products] capped at MAX_URLS=${MAX_URLS} for shop ${shop.domain} — split into sub-sitemaps when this becomes the norm.`,
        );
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
