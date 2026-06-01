import 'server-only';
import type { Payload } from 'payload';
import type { FindFallbackLocale, FindLocale } from './_locale-cast';
import { assertShopId } from './assert-shop';
import type { LocaleRef, ShopRef } from './get-page';
import { getPayloadInstance } from './get-payload-instance';
import { resolveTenantId } from './resolve-tenant-id';

/**
 * Arguments accepted by {@link getProductMetadata}.
 *
 * @example
 *   const args: GetProductMetadataArgs = { shop, locale, shopifyHandle: 'my-product' };
 */
export type GetProductMetadataArgs = {
    shop: ShopRef;
    locale: LocaleRef;
    shopifyHandle: string;
    draft?: boolean;
    __payload?: Payload;
};

/**
 * Fetch the CMS metadata record for a Shopify product identified by its handle.
 * Returns `null` when the handle does not match any record for this shop.
 *
 * @param args - Shop, locale, Shopify product handle, optional flags.
 * @returns The product-metadata document at depth 2, or `null`.
 *
 * @example
 *   const meta = await getProductMetadata({ shop, locale, shopifyHandle: 'my-product' });
 */
export const getProductMetadata = async ({
    shop,
    locale,
    shopifyHandle,
    draft = false,
    __payload,
}: GetProductMetadataArgs) => {
    assertShopId(shop);
    const payload = __payload ?? (await getPayloadInstance());
    const tenantId = await resolveTenantId(payload, shop.id);
    if (!tenantId) return null;

    const { docs } = await payload.find({
        collection: 'productMetadata',
        where: { and: [{ tenant: { equals: tenantId } }, { shopifyHandle: { equals: shopifyHandle } }] } as never,
        locale: locale.code as FindLocale,
        fallbackLocale: shop.i18n.defaultLocale as FindFallbackLocale,
        depth: 2,
        limit: 1,
        draft,
    });
    return docs[0] ?? null;
};
