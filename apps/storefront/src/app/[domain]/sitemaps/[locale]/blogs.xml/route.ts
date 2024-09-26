import { Error } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi, BlogsApi } from '@/api/shopify/blog';
import { Locale } from '@/utils/locale';
import { notFound } from 'next/navigation';
import { getServerSideSitemap } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../../sitemap.xml/route';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';

export const dynamic = 'force-static';
export const revalidate = false;

export type BlogsSitemapRouteParams = {
    params: Promise<
        Awaited<DynamicSitemapRouteParams> & {
            locale: string;
        }
    >;
};
export async function GET({}: NextRequest, { params }: BlogsSitemapRouteParams) {
    const { domain, locale: localeData } = await params;
    if (!localeData) {
        notFound();
    }

    const locale = Locale.from(localeData);

    const shop = await findShopByDomainOverHttp(domain);
    const api = await ShopifyApolloApiClient({ shop, locale });

    const [blogs, blogsError] = await BlogsApi({ api });
    if (blogsError) {
        if (!Error.isNotFound(blogsError)) {
            console.error(blogsError);
        }

        notFound(); // TODO
    }

    const articles = await Promise.all(
        blogs.map(async ({ handle: blogHandle }) => {
            const [blog, blogError] = await BlogApi({ api, handle: blogHandle });
            if (blogError) {
                if (!Error.isNotFound(blogError)) {
                    console.error(blogError);
                }

                return [];
            }

            return blog.articles.edges.map(({ node: article }) => ({
                ...article,
                blog: {
                    handle: blogHandle
                }
            }));
        })
    );

    return getServerSideSitemap(
        articles.flatMap((articles) => {
            if (articles.length <= 0) {
                return [];
            }

            const blogHandle = articles[0].blog.handle;
            let pages: ISitemapField[] = [
                {
                    loc: `https://${shop.domain}/${locale.code}/blogs/${blogHandle}/`,
                    changefreq: 'weekly',
                    lastmod: undefined,
                    alternateRefs: [],
                    trailingSlash: true
                },
                ...articles.map(
                    ({ handle, publishedAt }) =>
                        ({
                            loc: `https://${shop.domain}/${locale.code}/blogs/${blogHandle}/${handle}/`,
                            changefreq: 'yearly',
                            lastmod: publishedAt,
                            alternateRefs: [],
                            trailingSlash: true
                        }) as ISitemapField
                )
            ];

            return pages;
        })
    );
}
