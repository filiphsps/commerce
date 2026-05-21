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

const emptyResult = { docs: [], totalDocs: 0, hasNextPage: false, hasPrevPage: false, page: 1 };

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
    const tenantId = await resolveTenantId(payload, shop.id);
    if (!tenantId) return emptyResult as never as Awaited<ReturnType<Payload['find']>>;
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
