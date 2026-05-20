import { getPage as CmsGetPage } from '@nordcom/commerce-cms/api';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { NormalizedShopifyPage } from '@/api/shopify/page';
import type { Locale } from '@/utils/locale';

export type CmsPageData = Awaited<ReturnType<typeof CmsGetPage>>;

export type ProvidedPage =
    | { provider: 'cms'; data: NonNullable<CmsPageData> }
    | { provider: 'shopify'; data: NormalizedShopifyPage };

export type ProvidedPages =
    | { provider: 'cms'; items: Array<NonNullable<CmsPageData>> }
    | { provider: 'shopify'; items: NormalizedShopifyPage[] };

export async function PagesApi({}: { shop: OnlineShop; locale: Locale }): Promise<ProvidedPages | null> {
    // CMS-managed pages are fetched per-handle in PageApi; listing all pages
    // is not a current use case — return an empty list instead of throwing.
    return { provider: 'cms', items: [] };
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
