import type { OnlineShop } from '@nordcom/commerce-db';
import { Error as CommerceError } from '@nordcom/commerce-errors';
import { getPage as CmsGetPage } from '@nordcom/commerce-cms/api';
import { ShopifyApolloApiClient } from '@/api/shopify';
import type { NormalizedShopifyPage } from '@/api/shopify/page';
import { ShopifyPageApi, ShopifyPagesApi } from '@/api/shopify/page';
import type { Locale } from '@/utils/locale';

export type CmsPageData = Awaited<ReturnType<typeof CmsGetPage>>;

export type ProvidedPage =
    | { provider: 'cms'; data: NonNullable<CmsPageData> }
    | { provider: 'shopify'; data: NormalizedShopifyPage };

export type ProvidedPages =
    | { provider: 'cms'; items: Array<NonNullable<CmsPageData>> }
    | { provider: 'shopify'; items: NormalizedShopifyPage[] };

export async function PagesApi({
    shop,
    locale,
}: {
    shop: OnlineShop;
    locale: Locale;
}): Promise<ProvidedPages | null> {
    switch (shop.contentProvider.type) {
        case 'shopify': {
            const api = await ShopifyApolloApiClient({ shop, locale });
            const [items, err] = await ShopifyPagesApi({ api });
            if (err) {
                if (!CommerceError.isNotFound(err)) console.error(err);
                return null;
            }
            return { provider: 'shopify', items };
        }
        default: {
            // CMS-managed pages are fetched per-handle in PageApi; listing all pages
            // is not a current use case — return an empty list instead of throwing.
            return { provider: 'cms', items: [] };
        }
    }
}

export async function PageApi({
    shop,
    locale,
    handle,
}: {
    shop: OnlineShop;
    locale: Locale;
    handle: string;
    /** @deprecated Retained for source compatibility; CMS lookups go through getPage by slug. */
    type?: string;
}): Promise<ProvidedPage | null> {
    switch (shop.contentProvider.type) {
        case 'shopify': {
            const api = await ShopifyApolloApiClient({ shop, locale });
            const [data, err] = await ShopifyPageApi({ api, handle });
            if (err) {
                if (!CommerceError.isNotFound(err)) console.error(err);
                return null;
            }
            return { provider: 'shopify', data };
        }
        default: {
            const data = await CmsGetPage({
                shop: {
                    id: shop.id,
                    domain: shop.domain,
                    i18n: { defaultLocale: shop.i18n?.defaultLocale ?? 'en-US' },
                },
                locale: { code: locale.code },
                slug: handle,
            });
            if (!data) return null;
            return { provider: 'cms', data };
        }
    }
}
