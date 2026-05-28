import { Error } from '@nordcom/commerce-errors';
import { trace } from '@opentelemetry/api';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound } from 'next/navigation';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import { BlogApi, Shop } from '@/api/_loaders';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogsApi } from '@/api/shopify/blog';
import { tenantRootTags } from '@/cache';
import { Locale } from '@/utils/locale';
import type { DynamicSitemapRouteParams } from '../../../sitemap.xml/route';

export type BlogsSitemapRouteParams = {
    params: Promise<
        Awaited<DynamicSitemapRouteParams> & {
            locale: string;
        }
    >;
};
/**
 * Build the per-locale blog/article sitemap for a tenant.
 *
 * Cached at `max` like its sibling sitemaps; the Shopify blog/article reads
 * inherit the HttpLink revalidate floor since the GraphQL default is no longer
 * `no-store`. The Shopify cache schema has no blog entity, so the entry is
 * tagged with the tenant-root tags — the only available webhook-invalidation
 * handle, busted by the broad `shopify.<id>` sweep on a blog/shop change.
 * Without a tag the `max` entry would never refresh.
 *
 * @param params - Route params resolving the tenant `domain` and `locale`.
 * @returns A `next-sitemap` XML response listing blog and article URLs.
 * @throws Triggers `notFound()` when the locale is missing or blogs can't be fetched.
 */
export async function GET({}: NextRequest, { params }: BlogsSitemapRouteParams) {
    'use cache';
    cacheLife('max');

    const { domain, locale: localeData } = await params;
    if (!localeData) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    cacheTag(...tenantRootTags(shop));
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [blogs, blogsError] = await BlogsApi({ api });
    if (blogsError) {
        if (!Error.isNotFound(blogsError)) {
            trace.getActiveSpan()?.addEvent('sitemap.blogs_fetch_failed', {
                'error.message': (blogsError as Error)?.message ?? String(blogsError),
                'shop.domain': domain,
            });
        }

        notFound(); // TODO
    }

    const articles = await Promise.all(
        blogs.map(async ({ handle: blogHandle }) => {
            const [blog, blogError] = await BlogApi({ api, handle: blogHandle });
            if (blogError) {
                if (!Error.isNotFound(blogError)) {
                    trace.getActiveSpan()?.addEvent('sitemap.blog_fetch_failed', {
                        'error.message': (blogError as Error)?.message ?? String(blogError),
                        'blog.handle': blogHandle,
                        'shop.domain': domain,
                    });
                }

                return [];
            }

            return blog.articles.edges.map(({ node: article }) => ({
                ...article,
                blog: {
                    handle: blogHandle,
                },
            }));
        }),
    );

    return getServerSideSitemap(
        articles.flatMap((articles) => {
            if (articles.length <= 0) {
                return [];
            }

            const blogHandle = articles[0].blog.handle;
            const pages: ISitemapField[] = [
                {
                    loc: `https://${shop.domain}/${locale.code}/blogs/${blogHandle}/`,
                    changefreq: 'weekly',
                    lastmod: undefined,
                    alternateRefs: [],
                    trailingSlash: true,
                },
                ...articles.map(
                    ({ handle, publishedAt }) =>
                        ({
                            loc: `https://${shop.domain}/${locale.code}/blogs/${blogHandle}/${handle}/`,
                            changefreq: 'yearly',
                            lastmod: publishedAt,
                            alternateRefs: [],
                            trailingSlash: true,
                        }) as ISitemapField,
                ),
            ];

            return pages;
        }),
    );
}
