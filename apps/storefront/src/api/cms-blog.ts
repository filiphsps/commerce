import 'server-only';

import { getArticles } from '@nordcom/commerce-cms/api';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { runCmsDualRead } from './_cms-shadow';
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
 * on Routes for the article-overlay design. Routed through the SFREAD-12
 * dual-read loader; flipped BY DEFAULT since CUTOVER-05 (the Convex
 * `cms/read:articles` listing is authoritative, `CMS_READ_FLIP=-articles` is
 * the emergency-shadow lever). The Convex side returns the full tag-filtered,
 * `publishedAt`-ordered list, and the requested window is sliced here so both
 * backends compare and serve the same page of docs.
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
    return runCmsDualRead<BlogApiResult>({
        getter: 'articles',
        shopId: shop.id,
        locale: locale.code,
        key: tag,
        mongo: async () => {
            const result = await getArticles({
                shop: toShopRef(shop),
                locale: { code: locale.code },
                page,
                limit,
                tag,
            });
            return normalizePayloadDoc(result, locale.code);
        },
        convex: async (query) => {
            const result = (await query('cms/read:articles', {
                shopId: shop.id,
                locale: locale.code,
                tag,
            })) as { docs: unknown[] };
            return { docs: result.docs.slice((page - 1) * limit, page * limit), totalDocs: result.docs.length };
        },
        project: (result) => ({ docs: result.docs, totalDocs: result.totalDocs }),
        // The flip path rebuilds the pagination envelope from the windowed Convex docs.
        fromConvex: (value) => {
            const { docs, totalDocs } = value as { docs: BlogApiResult['docs']; totalDocs: number };
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
            } as BlogApiResult;
        },
    });
}
