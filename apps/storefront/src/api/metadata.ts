import 'server-only';

import { getCollectionMetadata, getProductMetadata } from '@nordcom/commerce-cms/api';
import type { CollectionMetadatum, ProductMetadatum } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { runCmsDualRead } from './_cms-shadow';
import { isDraftModeEnabled } from './_draft';
import { normalizePayloadDoc } from './_normalize-payload';

export type MetadataApiArgs = { shop: OnlineShop; locale: Locale; handle: string };

/**
 * CMS metadata overlay for a Shopify product handle. The returned doc carries
 * descriptionOverride (ProseMirror rich text), supplemental render blocks, and
 * SEO field overrides — applied on top of the Shopify product page. Routed
 * through the SFREAD-12 dual-read loader; flipped BY DEFAULT since CUTOVER-05
 * (the Convex `cms/read:productMetadataByHandle` read is authoritative and
 * resolves by the same Shopify-handle natural key as the Mongo getter;
 * `CMS_READ_FLIP=-productMetadata` is the emergency-shadow lever). A
 * draft-mode request forwards the draft flag down BOTH legs and skips the
 * shadow.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @param options.handle - Shopify product handle to look up in the CMS.
 * @returns The normalized product metadata overlay, or `null` when no entry exists.
 */
export async function ProductMetadataApi({ shop, locale, handle }: MetadataApiArgs): Promise<ProductMetadatum | null> {
    const draft = await isDraftModeEnabled();
    return runCmsDualRead<ProductMetadatum | null>({
        getter: 'productMetadata',
        shopId: shop.id,
        locale: locale.code,
        key: handle,
        draft,
        mongo: async () => {
            const meta = await getProductMetadata({
                shop: toShopRef(shop),
                locale: { code: locale.code },
                shopifyHandle: handle,
                draft,
            });
            return meta ? normalizePayloadDoc(meta, locale.code) : null;
        },
        convex: (query) =>
            query('cms/read:productMetadataByHandle', {
                shopId: shop.id,
                handle,
                locale: locale.code,
                ...(draft ? { draft: true } : {}),
            }),
    });
}

/**
 * CMS metadata overlay for a Shopify collection handle. Same overlay
 * semantics as `ProductMetadataApi` — default-flipped to the Convex
 * `cms/read:collectionMetadataByHandle` read since CUTOVER-05, with
 * `CMS_READ_FLIP=-collectionMetadata` as the emergency-shadow lever —
 * including the draft-mode forwarding.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @param options.handle - Shopify collection handle to look up in the CMS.
 * @returns The normalized collection metadata overlay, or `null` when no entry exists.
 */
export async function CollectionMetadataApi({
    shop,
    locale,
    handle,
}: MetadataApiArgs): Promise<CollectionMetadatum | null> {
    const draft = await isDraftModeEnabled();
    return runCmsDualRead<CollectionMetadatum | null>({
        getter: 'collectionMetadata',
        shopId: shop.id,
        locale: locale.code,
        key: handle,
        draft,
        mongo: async () => {
            const meta = await getCollectionMetadata({
                shop: toShopRef(shop),
                locale: { code: locale.code },
                shopifyHandle: handle,
                draft,
            });
            return meta ? normalizePayloadDoc(meta, locale.code) : null;
        },
        convex: (query) =>
            query('cms/read:collectionMetadataByHandle', {
                shopId: shop.id,
                handle,
                locale: locale.code,
                ...(draft ? { draft: true } : {}),
            }),
    });
}
