import 'server-only';
import type { Payload } from 'payload';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';

export type GetHeaderArgs = { shop: ShopRef; locale: LocaleRef; draft?: boolean; __payload?: Payload };

export const getHeader = async ({ shop, locale, draft = false, __payload }: GetHeaderArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const { docs } = await payload.find({
        collection: 'header',
        where: { tenant: { equals: shop.id } },
        locale: locale.code,
        fallbackLocale: shop.i18n.defaultLocale,
        depth: 2,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};
