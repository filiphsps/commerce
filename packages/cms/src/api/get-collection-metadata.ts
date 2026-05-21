import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

export type GetCollectionMetadataArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    shopifyHandle: string;
    draft?: boolean;
    __payload?: Payload;
};

export const getCollectionMetadata = async ({
    shop,
    locale,
    shopifyHandle,
    draft = false,
    __payload,
}: GetCollectionMetadataArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const tenantId = await resolveTenantId(payload, shop.id);
    if (!tenantId) return null;

    const { docs } = await payload.find({
        collection: 'collectionMetadata',
        where: { and: [{ tenant: { equals: tenantId } }, { shopifyHandle: { equals: shopifyHandle } }] } as never,
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        depth: 2,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};
