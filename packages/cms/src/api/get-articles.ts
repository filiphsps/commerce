import 'server-only';
import type { Payload } from 'payload';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';

export type GetArticlesArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    limit?: number;
    page?: number;
    tag?: string;
    draft?: boolean;
    __payload?: Payload;
};

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
    // `contains` translates to a MongoDB regex against the `tags` array — that
    // both does a substring match (`news` matches `breaking-news`) AND lets
    // attacker-supplied regex metachars (`.+*?()[]\`) through to the query,
    // which is a ReDoS / partial-DoS surface. Use `in` for an exact-equality
    // match against any element of the hasMany text field.
    const where = (
        tag ? { and: [{ tenant: { equals: shop.id } }, { tags: { in: [tag] } }] } : { tenant: { equals: shop.id } }
    ) as never;
    return payload.find({
        collection: 'articles',
        where,
        locale: locale.code,
        fallbackLocale: shop.i18n.defaultLocale,
        depth: 1,
        limit,
        page,
        sort: '-publishedAt',
        draft,
    });
};
