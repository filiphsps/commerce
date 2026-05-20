import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';

export type GetPagesArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    limit?: number;
    page?: number;
    draft?: boolean;
    __payload?: Payload;
};

export const getPages = async ({ shop, locale, limit = 100, page = 1, draft = false, __payload }: GetPagesArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    return payload.find({
        collection: 'pages',
        where: { tenant: { equals: shop.id } } as never,
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        // depth: 0 — sitemap only needs slug + updatedAt; relations are wasted IO here.
        depth: 0,
        limit,
        page,
        draft,
    });
};
