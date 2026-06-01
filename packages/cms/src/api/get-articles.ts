import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

/**
 * Arguments accepted by {@link getArticles}.
 *
 * @example
 *   const args: GetArticlesArgs = { shop, locale, limit: 6, tag: 'news' };
 */
export type GetArticlesArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    limit?: number;
    page?: number;
    tag?: string;
    draft?: boolean;
    __payload?: Payload;
};

// Defensive fallback for a falsy tenant resolution. See `get-pages.ts` for the
// full rationale — TL;DR: never drop the tenant predicate, but keep the
// helper's return type narrow.
const TENANT_RESOLUTION_FAILED = '__cms_no_tenant_resolved__';

/**
 * Fetch a paginated list of articles for the given shop and locale. Optionally
 * filter by an exact tag value. The tenant predicate (the shop id) is always
 * applied, so a shop with no articles returns an empty result set rather than
 * leaking other tenants' articles.
 *
 * @param args - Shop, locale, optional `limit`/`page`/`tag`/`draft`, and an
 *   optional `__payload` instance for testing.
 * @returns The Payload find result (docs + pagination meta).
 *
 * @example
 *   const { docs } = await getArticles({ shop, locale, tag: 'featured' });
 */
export const getArticles = async ({
    shop,
    locale,
    limit = 12,
    page = 1,
    tag,
    draft = false,
    __payload,
}: GetArticlesArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const tenantId = (await resolveTenantId(payload, shop.id)) ?? TENANT_RESOLUTION_FAILED;
    // `contains` translates to a MongoDB regex against the `tags` array — that
    // both does a substring match (`news` matches `breaking-news`) AND lets
    // attacker-supplied regex metachars (`.+*?()[]\`) through to the query,
    // which is a ReDoS / partial-DoS surface. Use `in` for an exact-equality
    // match against any element of the hasMany text field.
    const where = (
        tag ? { and: [{ tenant: { equals: tenantId } }, { tags: { in: [tag] } }] } : { tenant: { equals: tenantId } }
    ) as never;

    return payload.find({
        collection: 'articles',
        where,
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        depth: 1,
        limit,
        page,
        sort: '-publishedAt',
        draft,
    });
};
