import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

/**
 * Arguments accepted by {@link getPages}.
 *
 * @example
 *   const args: GetPagesArgs = { shop, locale, limit: 50 };
 */
export type GetPagesArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    limit?: number;
    page?: number;
    draft?: boolean;
    __payload?: Payload;
};

// Sentinel for shops whose Tenant doc hasn't been synced yet. Using a string
// that cannot collide with a real Payload ObjectId returns an empty result
// without dropping the tenant predicate (dropping it would leak cross-tenant
// pages). Preserves the helper's narrow return type so callers can still
// access `.docs[i].slug` without TS widening the doc union.
const TENANT_RESOLUTION_FAILED = '__cms_no_tenant_resolved__';

/**
 * Fetch a paginated list of pages for the given shop and locale. Primarily used
 * for sitemap generation; returned documents are at depth 0 to avoid loading
 * block relations that are not needed for slug enumeration.
 *
 * @param args - Shop, locale, optional `limit`/`page`/`draft`, optional `__payload`.
 * @returns The Payload find result (docs + pagination meta).
 *
 * @example
 *   const { docs } = await getPages({ shop, locale });
 */
export const getPages = async ({ shop, locale, limit = 100, page = 1, draft = false, __payload }: GetPagesArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const tenantId = (await resolveTenantId(payload, shop.id)) ?? TENANT_RESOLUTION_FAILED;
    return payload.find({
        collection: 'pages',
        where: { tenant: { equals: tenantId } } as never,
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        // depth: 0 — sitemap only needs slug + updatedAt; relations are wasted IO here.
        depth: 0,
        limit,
        page,
        draft,
    });
};
