import { PagesApi } from '@/api/page';
import { ShopApi } from '@/api/shop';
import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';
import { BlogApi } from '@/api/shopify/blog';
import { CollectionsApi } from '@/api/shopify/collection';
import { ProductsApi } from '@/api/shopify/product';
import { StoreApi } from '@/api/store';
import type { Locale } from '@/utils/locale';
import { DefaultLocale } from '@/utils/locale';
import { getServerSideSitemap } from 'next-sitemap';
import type { NextRequest } from 'next/server';

/* c8 ignore start */
export type DynamicSitemapRouteParams = {
    domain: string;
};
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    let urls: any[] = [],
        locales: Locale[] = [];

    const shop = await ShopApi({ domain });
    const locale = DefaultLocale();
    const apiConfig = await shopifyApiConfig({ shop, noHeaders: true });
    const api = await StorefrontApiClient({ shop, locale, apiConfig });

    interface SitemapEntry {
        location: string;
        priority?: number;
    }

    let pages: SitemapEntry[] = [];
    try {
        const store = await StoreApi({ api, locale });
        locales = store.i18n.locales;

        pages = (await PagesApi({ shop, locale }))
            .filter((i) => i.uid !== 'homepage')
            .map((page) => {
                let location = (page.href.split('/')[2] || '') as string;
                if (location && !location.endsWith('/')) location = `${location}/`;

                return {
                    location,
                    priority: ((location) => {
                        // TODO: Make this configurable.
                        if (location === '') {
                            return 1;
                        } else if (location === 'cart/') {
                            return 0.1;
                        } else if (location === 'search/') {
                            return 0.1;
                        } else if (location === 'countries/') {
                            return 0.1;
                        } else if (location === 'terms-of-service/') {
                            return 0.1;
                        } else if (location === 'about/') {
                            return 0.1;
                        }

                        return 0.5;
                    })(location)
                } as SitemapEntry;
            });
    } catch (error) {
        console.error(error);
    }

    const collections = (await CollectionsApi({ client: api })).map(
        (collection) =>
            ({
                location: `collections/${collection.handle}/`,
                priority: 1.0
            }) as SitemapEntry
    );
    const products = (await ProductsApi({ api, limit: 250 })).products.map(
        (product) =>
            ({
                location: `products/${product.node.handle!}/`,
                priority: 0.8
            }) as SitemapEntry
    );

    // TODO: Handle multiple blogs.
    const blogs = (await BlogApi({ api, handle: 'news' })).articles.edges.map(
        ({ node: article }) =>
            ({
                location: `blog/news/${article.handle}/`,
                priority: 0.9
            }) as SitemapEntry
    );

    const objects: Array<SitemapEntry[]> = [pages, collections, products, blogs];
    const url = `https://${domain}/`;

    urls.push(
        ...objects
            .flat()
            .map((item) => {
                // TODO: Add proper date support.
                const modified = new Date().toISOString();

                return locales.map(({ locale }) => ({
                    loc: `${url}${locale}/${item.location}`,
                    lastmod: modified,
                    priority: item.priority || 0.7

                    // FIXME: `alternateRefs`.
                    /*alternateRefs: locales
                        ?.map(
                            ({ locale: subLocale }) =>
                                (locale !== subLocale && {
                                    href: `${url}${subLocale}/${item.location}`,
                                    hreflang: subLocale,
                                    hrefIsAbsolute: true
                                }) ||
                                null
                        )
                        .filter((_) => _)*/
                }));
            })
            .flat()
    );

    return getServerSideSitemap(urls);
}
/* c8 ignore stop */
