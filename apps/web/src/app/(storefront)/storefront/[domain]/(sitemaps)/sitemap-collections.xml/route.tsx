import { ShopApi } from '@/api/shop';
import { StorefrontApiClient, shopifyApiConfig } from '@/api/shopify';
import { CollectionsPaginationApi } from '@/api/shopify/collection';
import { LocalesApi } from '@/api/store';
import { Error, UnknownApiError } from '@/utils/errors';
import { Locale } from '@/utils/locale';
import type { Collection } from '@shopify/hydrogen-react/storefront-api-types';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import { NextResponse, type NextRequest } from 'next/server';
import type { DynamicSitemapRouteParams } from '../sitemap.xml/route';

export const dynamic = 'force-dynamic';

/* c8 ignore start */
export async function GET(_: NextRequest, { params: { domain } }: { params: DynamicSitemapRouteParams }) {
    try {
        const shop = await ShopApi({ domain });
        const locale = Locale.default;
        const apiConfig = await shopifyApiConfig({ shop, noHeaders: true });
        const api = await StorefrontApiClient({ shop, locale, apiConfig });
        const locales = await LocalesApi({ api });

        let res,
            collections: Collection[] = [];
        while ((res = await CollectionsPaginationApi({ api, limit: 75, after: res?.page_info?.end_cursor }))) {
            collections.push(...res.collections.map(({ node: collection }) => collection));
            if (!res.page_info.has_next_page) break;
        }

        return getServerSideSitemap(
            locales
                .map(({ code }) => {
                    return collections.map(
                        (collection) =>
                            ({
                                loc: `https://${shop.domains.primary}/${code}/collections/${collection.handle}/`,
                                changefreq: 'daily',
                                lastmod: collection.updatedAt,
                                alternateRefs: locales
                                    .filter(({ code: _code }) => code !== _code)
                                    .map(({ code }) => ({
                                        href: `https://${shop.domains.primary}/${code}/collections/${collection.handle}/`,
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
/* c8 ignore stop */
