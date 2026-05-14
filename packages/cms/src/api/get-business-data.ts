import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';

export type GetBusinessDataArgs = { shop: ShopRef; locale: LocaleRef; draft?: boolean; __payload?: Payload };

export const getBusinessData = async ({ shop, locale, draft = false, __payload }: GetBusinessDataArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const { docs } = await payload.find({
        collection: 'businessData',
        where: { tenant: { equals: shop.id } },
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        depth: 1,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};
