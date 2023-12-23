import { ShopApi } from '@/api/shop';
import { ShopifyApiConfig, StorefrontApiClient } from '@/api/shopify';
import { ProductsPaginationApi } from '@/api/shopify/product';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import type { Product } from '@shopify/hydrogen-react/storefront-api-types';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import type { NextRequest } from 'next/server';
import type { DynamicSitemapRouteParams } from '../sitemap.xml/route';

/* c8 ignore start */
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await ShopApi(domain);
    const locale = Locale.default;
    const apiConfig = await ShopifyApiConfig({ shop, noHeaders: true });
    const api = await StorefrontApiClient({ shop, locale, apiConfig });
    const locales = await LocalesApi({ api });

    let res,
        products: Product[] = [];
    while ((res = await ProductsPaginationApi({ api, limit: 75, after: res?.page_info?.end_cursor }))) {
        products.push(...res.products.map(({ node: product }) => product));
        if (!res.page_info.has_next_page) break;
    }

    return getServerSideSitemap(
        locales
            .map(({ locale }) => {
                return products.map(
                    (product) =>
                        ({
                            loc: `https://${shop.domains.primary}/${locale}/products/${product.handle}/`,
                            changefreq: 'daily',
                            lastmod: product.updatedAt,
                            alternateRefs: locales
                                .filter(({ locale: code }) => code !== locale)
                                .map(({ locale }) => ({
                                    href: `https://${shop.domains.primary}/${locale}/products/${product.handle}/`,
                                    hreflang: locale,
                                    hrefIsAbsolute: true
                                })),
                            //priority: 0.9,
                            trailingSlash: true
                        }) as ISitemapField
                );
            })
            .flat(1)
    );
}
/* c8 ignore stop */
