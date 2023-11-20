import { BlogApi } from '@/api/blog';
import { PagesApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import { CollectionsApi } from '@/api/shopify/collection';
import { ProductsApi } from '@/api/shopify/product';
import { StoreApi } from '@/api/store';
import type { Locale } from '@/utils/locale';
import { DefaultLocale } from '@/utils/locale';
import { getServerSideSitemap } from 'next-sitemap';
import type { NextRequest } from 'next/server';

export type DynamicSitemapRouteParams = {
    domain: string;
};
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    let urls: any[] = [],
        locales: Locale[] = [];
    const locale = DefaultLocale();

    // FIXME: This is a hack to fix the sitemap for the main domain.
    if (domain === 'sweetsideofsweden.com') {
        domain = `www.${domain}`;
    }

    interface SitemapEntry {
        location: string;
        priority?: number;
    }

    let pages: SitemapEntry[] = [];
    try {
        const api = StorefrontApiClient({ domain, locale });
        const store = await StoreApi({ domain, locale, api });
        locales = store.i18n.locales;

        pages = ((await PagesApi({ locale })) as any).paths
            .filter((i: any) => i !== '/')
            .map((page: any) => {
                let location = (page.split('/')[2] || '') as string;
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
        console.warn(error);
    }

    const api = StorefrontApiClient({ locale });

    const collections = (await CollectionsApi({ client: api })).map(
        (collection) =>
            ({
                location: `collections/${collection.handle}/`,
                priority: 1.0
            }) as SitemapEntry
    );
    const products = (await ProductsApi({ client: api, limit: 250 })).products.map(
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
