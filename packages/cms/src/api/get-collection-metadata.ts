import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

/**
 * Arguments accepted by {@link getCollectionMetadata}.
 *
 * @example
 *   const args: GetCollectionMetadataArgs = { shop, locale, shopifyHandle: 'sale' };
 */
export type GetCollectionMetadataArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    shopifyHandle: string;
    draft?: boolean;
    __payload?: Payload;
};

/**
 * Fetch the CMS metadata record for a Shopify collection identified by its
 * handle. Returns `null` when the tenant is unsynced, the handle does not
 * match any record, or the shop id is missing.
 *
 * @param args - Shop, locale, Shopify collection handle, optional flags.
 * @returns The collection-metadata document at depth 2, or `null`.
 *
 * @example
 *   const meta = await getCollectionMetadata({ shop, locale, shopifyHandle: 'sale' });
 */
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
