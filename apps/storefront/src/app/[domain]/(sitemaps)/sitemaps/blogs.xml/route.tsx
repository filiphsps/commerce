import { Error, TodoError } from '@nordcom/commerce-errors';

import { findShopByDomainOverHttp } from '@/api/shop';
import { ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import { notFound } from 'next/navigation';
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSideSitemap } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../sitemap.xml/route';
import type { ISitemapField } from 'next-sitemap';

export const dynamic = 'force-static';
export const revalidate = false;

export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    try {
        const locale = Locale.default;

        const shop = await findShopByDomainOverHttp(domain);
        const api = await ShopifyApolloApiClient({ shop, locale });

        const [blog, blogError] = await BlogApi({ api, handle: 'news' });
        if (blogError) {
            if (Error.isNotFound(blogError)) {
                notFound();
            }

            console.error(blogError);
            throw blogError;
        }

        const locales = await LocalesApi({ api });

        const articles = blog.articles.edges.map(({ node: article }) => article);
        return getServerSideSitemap(
            locales
                .map(({ code }) => {
                    return articles.map(
                        (article) =>
                            ({
                                // TODO: Support more than one blog.
                                loc: `https://${shop.domain}/${code}/blog/${article.handle}/`,
                                changefreq: 'never',
                                lastmod: article.publishedAt,
                                alternateRefs: locales
                                    .filter(({ code: c }) => code !== c)
                                    .map(({ code }) => ({
                                        href: `https://${shop.domain}/${code}/blog/${article.handle}/`,
                                        hreflang: code,
                                        hrefIsAbsolute: true
                                    })),
                                //priority: 0.9,
                                trailingSlash: true
                            }) as ISitemapField
                    );
                })
                .flat(1)
        );
    } catch (error: unknown) {
        switch (true) {
            // Switch case to let us easily add more specific error handling.
            case error instanceof Error:
                return NextResponse.json(
                    {
                        status: error.statusCode ?? 500,
                        data: null,
                        errors: [error]
                    },
                    { status: error.statusCode ?? 500 }
                );
        }

        const ex = new TodoError();
        return NextResponse.json(
            {
                status: ex.statusCode,
                data: null,
                errors: [error, ex]
            },
            { status: ex.statusCode }
        );
    }
}
