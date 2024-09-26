import { PagesApi } from '@/api/page';
import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import { convertPrismicDateToISO } from '@/utils/prismic-date';
import { getServerSideSitemap } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../sitemap.xml/route';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET({}: NextRequest, { params }: { params: DynamicSitemapRouteParams }) {
    const { domain } = await params;
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
                            loc: `https://${shop.domain}/${code}/${page.url}${page.url && !page.url.endsWith('/') ? '/' : ''}`,
                            changefreq: 'weekly',
                            lastmod: convertPrismicDateToISO(page.last_publication_date),
                            //priority: 0.9,
                            trailingSlash: true
                        }) as ISitemapField
                );
            })
            .flat(1)
    );
}
