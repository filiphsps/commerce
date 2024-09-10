import { PagesApi } from '@/api/page';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import { convertPrismicDateToISO } from '@/utils/prismic-date';
import { getServerSideSitemap } from 'next-sitemap';

import type { ISitemapField } from 'next-sitemap';
import type { NextRequest } from 'next/server';
import type { DynamicSitemapRouteParams } from '../../sitemap.xml/route';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await findShopByDomainOverHttp(domain);
    const locale = Locale.default;
    const api = await ShopifyApiClient({ shop, locale });
    const locales = await LocalesApi({ api });

    const pages = ((await PagesApi({ shop, locale })) || [])
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
                            lastmod: convertPrismicDateToISO(page.last_publication_date),
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
