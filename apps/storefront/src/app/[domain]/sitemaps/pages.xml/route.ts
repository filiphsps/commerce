import { cmsTenantRootTags } from '@nordcom/commerce-cms/cache';
import { cacheLife, cacheTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import type { ISitemapField } from 'next-sitemap';
import { getServerSideSitemap } from 'next-sitemap';
import { LocalesApi, PagesApi, Shop } from '@/api/_loaders';
import { ShopifyApiClient } from '@/api/shopify';
import { tenantRootTags } from '@/cache';
import { Locale } from '@/utils/locale';
import type { DynamicSitemapRouteParams } from '../../sitemap.xml/route';

type SitemapPage = {
    url: string;
    lastmod: string | null;
};

/**
 * Builds the CMS-pages sitemap for a tenant from ONE batched `PagesApi` window.
 *
 * Convex budget posture (SFREAD-13, `@/utils/build-budget`): the whole document
 * list is a single getter call, so the SFREAD-12 dual-read fires at most ONE
 * shadow comparison per cache fill — never one per sitemap entry — and the
 * shadow itself is deferred via `after()`, off this route's render path.
 *
 * @param params - Route params resolving the tenant `domain`.
 * @returns A `next-sitemap` XML response listing every published CMS page per locale.
 */
export async function GET({}: NextRequest, { params }: { params: DynamicSitemapRouteParams }) {
    'use cache';
    cacheLife('max');

    const { domain } = await params;
    const shop = await Shop.findByDomain(domain, { sensitiveData: true });
    cacheTag(...tenantRootTags(shop), ...cmsTenantRootTags(shop));
    const locale = Locale.default;
    const api = await ShopifyApiClient({ shop, locale });
    const locales = await LocalesApi({ api });

    const pagesResult = await PagesApi({ shop, locale });
    const pages: SitemapPage[] = [];
    if ((pagesResult?.docs?.length || 0) > 0) {
        for (const page of pagesResult.docs) {
            if (!page.slug) continue;
            pages.push({ url: page.slug, lastmod: page.updatedAt ?? null });
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
