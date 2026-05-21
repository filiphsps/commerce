import 'server-only';

import { getArticles } from '@nordcom/commerce-cms/api';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';

export type BlogApiArgs = {
    shop: OnlineShop;
    locale: Locale;
    page?: number;
    limit?: number;
    tag?: string;
};

export type BlogApiResult = Awaited<ReturnType<typeof getArticles>>;

/**
 * Tenant-scoped paginated list of CMS Articles. Exposed for future custom
 * listings (e.g., a `/news` route). Not consumed by the current `/blogs/...`
 * route — those continue to read Shopify articles directly. See spec section
 * on Routes for the article-overlay design.
 */
export async function BlogApi({ shop, locale, page = 1, limit = 12, tag }: BlogApiArgs): Promise<BlogApiResult> {
    return getArticles({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        page,
        limit,
        tag,
    });
}
