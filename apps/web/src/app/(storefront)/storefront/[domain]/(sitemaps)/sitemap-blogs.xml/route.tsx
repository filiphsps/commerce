import { ShopApi } from '@/api/shop';
import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';
import { BlogApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import { DefaultLocale } from '@/utils/locale';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import type { NextRequest } from 'next/server';
import type { DynamicSitemapRouteParams } from '../sitemap.xml/route';

export const dynamic = 'force-dynamic';

/* c8 ignore start */
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    const shop = await ShopApi({ domain });
    const locale = DefaultLocale();
    const apiConfig = await shopifyApiConfig({ shop, noHeaders: true });
    const api = await StorefrontApiClient({ shop, locale, apiConfig });
    const locales = await LocalesApi({ api });

    const articles = (await BlogApi({ api, handle: 'news' })).articles.edges.map(({ node: article }) => article);
    return getServerSideSitemap(
        locales
            .map(({ locale }) => {
                return articles.map(
                    (article) =>
                        ({
                            // TODO: Support more than one blog.
                            loc: `https://${shop.domains.primary}/${locale}/blog/${article.handle}/`,
                            changefreq: 'never',
                            lastmod: article.publishedAt,
                            alternateRefs: locales
                                .filter(({ locale: code }) => code !== locale)
                                .map(({ locale }) => ({
                                    href: `https://${shop.domains.primary}/${locale}/blog/${article.handle}/`,
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
