import { BlogApi } from '@/api/blog';
import { PagesApi } from '@/api/page';
import { StorefrontApiClient } from '@/api/shopify';
import { CollectionsApi } from '@/api/shopify/collection';
import { ProductsApi } from '@/api/shopify/product';
import { BuildConfig } from '@/utils/build-config';
import { DefaultLocale } from '@/utils/locale';
import { getServerSideSitemap } from 'next-sitemap';

export async function GET() {
    const urls: any[] = [];
    const locales: string[] = BuildConfig.i18n?.locales || [];
    const locale = DefaultLocale();

    interface SitemapEntry {
        location: string;
        priority?: number;
    }

    let pages: SitemapEntry[] = [];
    try {
        pages = ((await PagesApi({ locale })) as any).paths
            .filter((i: any) => i !== '/')
            .map(
                (page: any) =>
                    ({
                        location: `${page.slice(1)}/`,
                        priority: 0.8
                    }) as SitemapEntry
            );
    } catch (error) {
        console.warn(error);
    }

    const client = StorefrontApiClient({ locale });

    const collections = (await CollectionsApi({ client })).map(
        (collection) =>
            ({
                location: `collections/${collection.handle}/`,
                priority: 1.0
            }) as SitemapEntry
    );
    const products = (await ProductsApi({ client })).products.map(
        (product) =>
            ({
                location: `products/${product.node.handle!}/`,
                priority: 0.8
            }) as SitemapEntry
    );

    // TODO: Handle multiple blogs.
    const blogs = (await BlogApi({ client, handle: 'news' })).articles.edges.map(
        ({ node: article }) =>
            ({
                location: `blog/news/${article.handle}/`,
                priority: 0.9
            }) as SitemapEntry
    );

    const objects: Array<SitemapEntry[]> = [pages, collections, products, blogs];
    const url = `https://${BuildConfig.domain}`;

    urls.push(
        ...objects
            .flat()
            .map((item) => {
                // TODO: Add proper date support.
                const modified = new Date().toISOString();

                return locales?.map((locale) => ({
                    loc: `https://${BuildConfig.domain}/${(locale !== 'x-default' && `${locale}/`) || ''}${
                        item.location
                    }`,
                    lastmod: modified,
                    priority: item.priority || 0.7,
                    alternateRefs: locales?.map((locale) => ({
                        href:
                            (locale !== 'x-default' && `${url}/${locale}/${item.location}`) ||
                            `${url}/${item.location}`,
                        hreflang: locale,
                        hrefIsAbsolute: true
                    }))
                }));
            })
            .flat()
    );

    return getServerSideSitemap(urls);
}
