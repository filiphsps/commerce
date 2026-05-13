import { Shop } from '@nordcom/commerce-db';
import { cacheLife } from 'next/cache';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import { PagesApi } from '@/api/page';
import { ShopifyApiClient } from '@/api/shopify';
import { LocalesApi } from '@/api/store';
import { Locale } from '@/utils/locale';
import type { DynamicSitemapRouteParams } from '../../sitemap.xml/route';

type SitemapPage = {
    url: string;
    lastmod: string | null;
};

export async function GET({}: NextRequest, { params }: { params: DynamicSitemapRouteParams }) {
    'use cache';
    cacheLife('max');

    const { domain } = await params;
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    const locale = Locale.default;
    const api = await ShopifyApiClient({ shop, locale });
    const locales = await LocalesApi({ api });

    const pagesResult = await PagesApi({ shop, locale });
    const pages: SitemapPage[] = [];
    if (pagesResult) {
        switch (pagesResult.provider) {
            case 'cms':
                for (const page of pagesResult.items) {
                    const p = page as { slug?: string; updatedAt?: string };
                    if (!p.slug) continue;
                    pages.push({ url: p.slug, lastmod: p.updatedAt ?? null });
                }
                break;
            case 'shopify':
                for (const page of pagesResult.items) {
                    pages.push({
                        url: page.handle,
                        lastmod: page.updatedAt,
                    });
                }
                break;
        }
    }

    return getServerSideSitemap(
        locales.flatMap(({ code }) =>
            pages.map(
                (page) =>
                    ({
                        loc: `https://${shop.domain}/${code}/${page.url}${page.url && !page.url.endsWith('/') ? '/' : ''}`,
                        changefreq: 'weekly',
                        lastmod: page.lastmod ?? undefined,
                        trailingSlash: true,
                    }) as ISitemapField,
            ),
        ),
    );
}
