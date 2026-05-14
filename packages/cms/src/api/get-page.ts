import 'server-only';
import type { Payload } from 'payload';
import { assertShopId } from './assert-shop';
import { getPayloadInstance } from './get-payload-instance';

export type ShopRef = { id: string; domain: string; i18n: { defaultLocale: string } };
export type LocaleRef = { code: string };

export type GetPageArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    slug: string;
    draft?: boolean;
    /** Test seam — pass a pre-booted Payload instance. */
    __payload?: Payload;
};

export const getPage = async ({ shop, locale, slug, draft = false, __payload }: GetPageArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const { docs } = await payload.find({
        collection: 'pages',
        where: { and: [{ tenant: { equals: shop.id } }, { slug: { equals: slug } }] },
        locale: locale.code,
        fallbackLocale: shop.i18n.defaultLocale,
        depth: 2,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};
