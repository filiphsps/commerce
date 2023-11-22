import { PagesApi } from '@/api/page';
import { ShopApi } from '@/api/shop';
import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { DefaultLocale } from '@/utils/locale';
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

    const pages = (await PagesApi({ shop, locale, exclude: [] })).map(({ url, ...page }) => ({
        ...page,
        url: url!.split('/').slice(2).join('/')
    }));

    return getServerSideSitemap(
        locales
            .map(({ locale }) => {
                return pages.map(
                    (page) =>
                        ({
                            loc: `https://${shop.domains.primary}/${locale}/${page.url}`, // Trailing slash is already added.
                            changefreq: 'monthly',
                            lastmod: page.last_publication_date,
                            alternateRefs: locales
                                .filter(({ locale: code }) => code !== locale)
                                .map(({ locale }) => ({
                                    href: `https://${shop.domains.primary}/${locale}/${page.url}`,
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
