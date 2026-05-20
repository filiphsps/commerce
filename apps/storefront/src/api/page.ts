import { getPage as CmsGetPage, getPages as CmsGetPages } from '@nordcom/commerce-cms/api';
import type { OnlineShop } from '@nordcom/commerce-db';
import { draftMode } from 'next/headers';
import type { NormalizedShopifyPage } from '@/api/shopify/page';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';

export type CmsPageData = Awaited<ReturnType<typeof CmsGetPage>>;

export type ProvidedPage =
    | { provider: 'cms'; data: NonNullable<CmsPageData> }
    | { provider: 'shopify'; data: NormalizedShopifyPage };

export type ProvidedPages =
    | { provider: 'cms'; items: Array<NonNullable<CmsPageData>> }
    | { provider: 'shopify'; items: NormalizedShopifyPage[] };

export async function PagesApi({ shop, locale }: { shop: OnlineShop; locale: Locale }): Promise<ProvidedPages | null> {
    const isDraft = (await draftMode()).isEnabled;
    const result = await CmsGetPages({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        draft: isDraft,
        limit: 1000,
    });
    return { provider: 'cms', items: result.docs as Array<NonNullable<CmsPageData>> };
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
    const isDraft = (await draftMode()).isEnabled;
    const data = await CmsGetPage({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        slug: handle,
        draft: isDraft,
    });
    if (!data) return null;
    return { provider: 'cms', data };
}
