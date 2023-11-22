import { ShopApi } from '@/api/shop';
import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';
import { CollectionsPaginationApi } from '@/api/shopify/collection';
import { LocalesApi } from '@/api/store';
import { DefaultLocale } from '@/utils/locale';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import type { NextRequest } from 'next/server';
import type { DynamicSitemapRouteParams } from '../sitemap.xml/route';

/* c8 ignore start */
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await ShopApi({ domain });
    const locale = DefaultLocale();
    const apiConfig = await shopifyApiConfig({ shop, noHeaders: true });
    const api = await StorefrontApiClient({ shop, locale, apiConfig });
    const locales = await LocalesApi({ api });

    let res,
        collections: Collection[] = [];
    while ((res = await CollectionsPaginationApi({ api, limit: 75, after: res?.page_info?.end_cursor }))) {
        collections.push(...res.collections.map(({ node: collection }) => collection));
        if (!res.page_info.has_next_page) break;
    }

    return getServerSideSitemap(
        locales
            .map(({ locale }) => {
                return collections.map(
                    (collection) =>
                        ({
                            loc: `https://${shop.domains.primary}/${locale}/collections/${collection.handle}/`,
                            changefreq: 'daily',
                            lastmod: collection.updatedAt,
                            alternateRefs: locales
                                .filter(({ locale: code }) => code !== locale)
                                .map(({ locale }) => ({
                                    href: `https://${shop.domains.primary}/${locale}/collections/${collection.handle}/`,
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
