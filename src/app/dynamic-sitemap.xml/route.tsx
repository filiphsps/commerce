import { BlogApi } from '@/api/blog';
import { CollectionsApi } from '@/api/collection';
import { PagesApi } from '@/api/page';
import { ProductsApi } from '@/api/product';
import { Config } from '@/utils/config';
import { DefaultLocale } from '@/utils/locale';
import { getServerSideSitemap } from 'next-sitemap';

export async function GET() {
    const urls: any[] = [];
    const locales: string[] = Config?.i18n?.locales || [];
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

    const collections = (await CollectionsApi({ locale })).map(
        (collection) =>
            ({
                location: `collections/${collection.handle}/`,
                priority: 1.0
            }) as SitemapEntry
    );
    const products = (await ProductsApi({ locale })).products.map(
        (product) =>
            ({
                location: `products/${product.node.handle!}/`,
                priority: 0.8
            }) as SitemapEntry
    );
    const blog = ((await BlogApi({ handle: 'news' })) as any).articles.map(
        (blog: any) =>
            ({
                location: `blog/${blog.handle}/`,
                priority: 0.9
            }) as SitemapEntry
    );

    const objects: Array<SitemapEntry[]> = [pages, collections, products, blog];
    const url = `https://${Config.domain}`;

    urls.push(
        ...objects
            .flat()
            .map((item) => {
                // TODO: Add proper date support.
                const modified = new Date().toISOString();

                return locales?.map((locale) => ({
                    loc: `https://${Config.domain}/${(locale !== 'x-default' && `${locale}/`) || ''}${item.location}`,
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
