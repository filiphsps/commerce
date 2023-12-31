import { ShopApi } from '@/api/shop';
import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { BlogApi } from '@/api/shopify/blog';
import { LocalesApi } from '@/api/store';
import { Error, NotFoundError, UnknownApiError } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import { NextResponse, type NextRequest } from 'next/server';
import type { DynamicSitemapRouteParams } from '../sitemap.xml/route';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    try {
        const shop = await ShopApi(domain);
        const locale = Locale.default;
        const apiConfig = await ShopifyApiConfig({ shop, noHeaders: true });
        const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });
        const locales = await LocalesApi({ api });

        // TODO: const blogs = await BlogsApi({ api });
        const blog = await BlogApi({ api, handle: 'news' });
        if (!blog) throw new NotFoundError(`"Blog" with the handle "${'news'}"`);

        const articles = blog.articles?.edges?.map?.(({ node: article }) => article) || [];
        return getServerSideSitemap(
            locales
                .map(({ code }) => {
                    return articles.map(
                        (article) =>
                            ({
                                // TODO: Support more than one blog.
                                loc: `https://${shop.domain}/${locale}/blog/${article.handle}/`,
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

        const ex = new UnknownApiError();
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
