import { NotFoundError } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { ProductsPaginationApi } from '@/api/shopify/product';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import { getServerSideSitemap } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../../sitemap.xml/route';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';

export async function GET(
    _: NextRequest,
    { params: { domain, region: regionData } }: { params: DynamicSitemapRouteParams & { region: string } }
) {
    const region = regionData.split('-').at(-1)?.split('.').at(0);
    if (!region) {
        throw new NotFoundError(`"Region" with the handle "${regionData}"`);
    }

    const shop = await findShopByDomainOverHttp(domain);
    const locale = Locale.from(`en-${region}`);
    const apiConfig = await ShopifyApiConfig({ shop });
    const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });
    const allLocales = await LocalesApi({ api });

    // FIXME: Remove duplicate locales.
    const locales = allLocales.filter(
        ({ country, language }) => country?.toLowerCase() === region.toLowerCase() && language.toLowerCase() === 'en'
    );

    let res,
        products: Product[] = [];
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
                    alternateRefs: [] /*locales
                        .filter(({ code }) => code !== locale.code)
                        .map(({ code }) => ({
                            href: `https://${shop.domain}/${code}/products/${product.handle}/`,
                            hreflang: code,
                            hrefIsAbsolute: true
                        }))*/, // FIXME: Deal with alternates.
                    //priority: 0.9,
                    trailingSlash: true
                }) as ISitemapField
        )
    );
}
