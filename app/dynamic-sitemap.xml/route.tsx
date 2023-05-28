import { BlogApi } from '../../src/api/blog';
import { CollectionsApi } from '../../src/api/collection';
import { Config } from '../../src/util/Config';
import { PagesApi } from '../../src/api/page';
import { ProductsApi } from '../../src/api/product';
import { getServerSideSitemap } from 'next-sitemap';

export async function GET() {
    const urls: any[] = [];
    const locales: string[] = Config?.i18n?.locales || [];

    interface SitemapEntry {
        location: string;
        priority?: number;
    }

    const pages = ((await PagesApi()) as any).map(
        (page) =>
            ({
                location: `${page}/`,
                priority: 0.7
            } as SitemapEntry)
    );
    const collections = (await CollectionsApi()).map(
        (collection) =>
            ({
                location: `collections/${collection.handle}/`,
                priority: 0.8
            } as SitemapEntry)
    );
    const products = (await ProductsApi()).products.map(
        (product) =>
            ({
                location: `products/${product.handle}/`,
                priority: 1.0
            } as SitemapEntry)
    );
    const blog = ((await BlogApi({ handle: 'news' })) as any).articles.map(
        (blog) =>
            ({
                location: `blog/${blog.handle}/`,
                priority: 0.9
            } as SitemapEntry)
    );

    const objects: Array<SitemapEntry[]> = [pages, collections, products, blog];

    urls.push(
        ...objects
            .flat()
            .map((item) => {
                // FIXME
                const modified = new Date().toISOString();

                return [
                    {
                        loc: `https://${Config.domain}/${item.location}`,
                        lastmod: modified,
                        priority: item.priority || 0.7,
                        alternateRefs: locales.map((locale) => ({
                            href: `https://${Config.domain}/${locale}/${item.location}`,
                            hreflang: locale,
                            hrefIsAbsolute: true
                        }))
                    }
                ];
            })
            .flat()
    );

    return getServerSideSitemap(urls);
}
