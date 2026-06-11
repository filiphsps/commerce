import 'server-only';

import type { Article } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import type { CmsPaginatedDocs } from './_cms';
import { cmsRead } from './_cms-read';

export type BlogApiArgs = {
    shop: OnlineShop;
    locale: Locale;
    page?: number;
    limit?: number;
    tag?: string;
};

/** The frozen `BlogApi` paginated envelope the storefront consumes. */
export type BlogApiResult = CmsPaginatedDocs<Article>;

/**
 * Tenant-scoped paginated list of CMS Articles from the Convex
 * `cms/read:articles` query. Exposed for future custom listings (e.g., a
 * `/news` route). Not consumed by the current `/blogs/...` route — those
 * continue to read Shopify articles directly. The Convex side returns the
 * full tag-filtered, `publishedAt`-ordered list; the requested window is
 * sliced here and the pagination envelope reconstructed so the SFREAD-01 list
 * contract stays byte-identical.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for CMS field resolution.
 * @param options.page - Page number; defaults to `1`.
 * @param options.limit - Articles per page; defaults to `12`.
 * @param options.tag - Optional tag filter.
 * @returns The contract-shaped article list result.
 */
export async function BlogApi({ shop, locale, page = 1, limit = 12, tag }: BlogApiArgs): Promise<BlogApiResult> {
    const result = (await cmsRead('cms/read:articles', {
        shopId: shop.id,
        locale: locale.code,
        tag,
    })) as { docs: Article[] };

    const docs = result.docs.slice((page - 1) * limit, page * limit);
    const totalDocs = result.docs.length;
    const totalPages = Math.max(1, Math.ceil(totalDocs / limit));
    return {
        docs,
        totalDocs,
        totalPages,
        page,
        pagingCounter: (page - 1) * limit + 1,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        limit,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
    };
}
