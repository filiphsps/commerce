import 'server-only';

import { getPage as CmsGetPage, getPages as CmsGetPages } from '@nordcom/commerce-cms/api';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';

export type CmsPageData = Awaited<ReturnType<typeof CmsGetPage>>;

export async function PagesApi({ shop, locale }: { shop: OnlineShop; locale: Locale }) {
    return await CmsGetPages({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        limit: 1000,
    });
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
}) {
    return await CmsGetPage({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        slug: handle,
    });
}
