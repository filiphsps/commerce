import 'server-only';
import type { Payload } from 'payload';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';

export type GetProductMetadataArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    shopifyHandle: string;
    draft?: boolean;
    __payload?: Payload;
};

export const getProductMetadata = async ({
    shop,
    locale,
    shopifyHandle,
    draft = false,
    __payload,
}: GetProductMetadataArgs) => {
    const payload = __payload ?? (await getPayloadInstance());
    const { docs } = await payload.find({
        collection: 'productMetadata',
        where: { and: [{ tenant: { equals: shop.id } }, { shopifyHandle: { equals: shopifyHandle } }] } as never,
        locale: locale.code,
        fallbackLocale: shop.i18n.defaultLocale,
        depth: 2,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};
