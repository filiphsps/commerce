import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

export type GetArticlesArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    limit?: number;
    page?: number;
    tag?: string;
    draft?: boolean;
    __payload?: Payload;
};

// Sentinel for shops whose Tenant doc hasn't been synced yet. See
// `get-pages.ts` for the full rationale — TL;DR: never drop the tenant
// predicate, but keep the helper's return type narrow.
const TENANT_RESOLUTION_FAILED = '__cms_no_tenant_resolved__';

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
