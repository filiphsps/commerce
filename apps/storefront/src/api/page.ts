import 'server-only';

import { getPage as CmsGetPage, getPages as CmsGetPages } from '@nordcom/commerce-cms/api';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { normalizePayloadDoc } from './_normalize-payload';

export type CmsPageData = Awaited<ReturnType<typeof CmsGetPage>>;

export async function PagesApi({ shop, locale }: { shop: OnlineShop; locale: Locale }) {
    const result = await CmsGetPages({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        limit: 1000,
    });
    return normalizePayloadDoc(result, locale.code);
}

export async function PageApi({ shop, locale, handle }: { shop: OnlineShop; locale: Locale; handle: string }) {
    const page = await CmsGetPage({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        slug: handle,
    });

    return page ? normalizePayloadDoc(page, locale.code) : null;
}
