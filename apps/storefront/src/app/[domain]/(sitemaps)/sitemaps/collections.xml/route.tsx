import { ShopApi } from '@nordcom/commerce-database';
import { Error, UnknownApiError } from '@nordcom/commerce-errors';

import { ShopifyApiConfig, ShopifyApolloApiClient } from '@/api/shopify';
import { CollectionsPaginationApi } from '@/api/shopify/collection';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import { unstable_cache as cache } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';
import { getServerSideSitemap } from 'next-sitemap';

import type { DynamicSitemapRouteParams } from '../../sitemap.xml/route';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import type { ISitemapField } from 'next-sitemap';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    try {
        const shop = await ShopApi(domain, cache, true);
        const locale = Locale.default;
        const apiConfig = await ShopifyApiConfig({ shop });
        const api = await ShopifyApolloApiClient({ shop, locale, apiConfig });
        const locales = await LocalesApi({ api });

        let res,
            collections: Collection[] = [];
        while ((res = await CollectionsPaginationApi({ api, limit: 75, after: res?.page_info.end_cursor }))) {
            collections.push(...res.collections.map(({ node: collection }) => collection));
            if (!res.page_info.has_next_page) break;
        }

        return getServerSideSitemap(
            locales
                .map(({ code }) => {
                    return collections.map(
                        (collection) =>
                            ({
                                loc: `https://${shop.domain}/${code}/collections/${collection.handle}/`,
                                changefreq: 'daily',
                                lastmod: collection.updatedAt,
                                alternateRefs: locales
                                    .filter(({ code: _code }) => code !== _code)
                                    .map(({ code }) => ({
                                        href: `https://${shop.domain}/${code}/collections/${collection.handle}/`,
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
