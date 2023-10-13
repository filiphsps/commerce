import { BlogApi } from '../../src/api/blog';
import { CollectionsApi } from '../../src/api/collection';
import { Config } from '../../src/util/Config';
import { PagesApi } from '../../src/api/page';
import { ProductsApi } from '../../src/api/product';
import { getServerSideSitemap } from 'next-sitemap';

export async function GET() {
    const urls: any[] = [];
    const locales: string[] = ['x-default', ...(Config?.i18n?.locales || [])];

    interface SitemapEntry {
        location: string;
        priority?: number;
    }

    let pages: SitemapEntry[] = [];
    try {
        pages = ((await PagesApi({})) as any).paths
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

    const collections = (await CollectionsApi()).map(
        (collection) =>
            ({
                location: `collections/${collection.handle}/`,
                priority: 1.0
            }) as SitemapEntry
    );
    const products = (await ProductsApi()).products.map(
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
                // FIXME
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
