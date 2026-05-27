import 'server-only';

import { getArticles } from '@nordcom/commerce-cms/api';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { normalizePayloadDoc } from './_normalize-payload';

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
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @param options.page - Page number; defaults to `1`.
 * @param options.limit - Articles per page; defaults to `12`.
 * @param options.tag - Optional tag filter.
 * @returns Normalized Payload article list result.
 */
export async function BlogApi({ shop, locale, page = 1, limit = 12, tag }: BlogApiArgs): Promise<BlogApiResult> {
    const result = await getArticles({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        page,
        limit,
        tag,
    });
    return normalizePayloadDoc(result, locale.code);
}
