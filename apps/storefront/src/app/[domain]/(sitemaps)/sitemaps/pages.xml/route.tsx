import { PagesApi } from '@/api/page';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApiClient, ShopifyApiConfig } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import { getServerSideSitemap } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../sitemap.xml/route';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';

export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await findShopByDomainOverHttp(domain);
    const locale = Locale.default;
    const apiConfig = await ShopifyApiConfig({ shop });
    const api = await ShopifyApiClient({ shop, locale, apiConfig });
    const locales = await LocalesApi({ api });

    const pages = ((await PagesApi({ shop, locale, exclude: [] })) || [])
        .filter(({ url }) => url)
        .map(({ url, ...page }) => ({
            ...page,
            url: url?.split('/').slice(2).join('/')
        }));

    return getServerSideSitemap(
        locales
            .map(({ code }) => {
                return pages.map(
                    (page) =>
                        ({
                            loc: `https://${shop.domain}/${code}/${page.url}`, // Trailing slash is already added.
                            changefreq: 'monthly',
                            lastmod: page.last_publication_date,
                            alternateRefs: locales
                                .filter(({ code: c }) => code !== c)
                                .map(({ code }) => ({
                                    href: `https://${shop.domain}/${code}/${page.url}`,
                                    hreflang: code,
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
