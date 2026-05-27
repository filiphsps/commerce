import 'server-only';

import { getCollectionMetadata, getProductMetadata } from '@nordcom/commerce-cms/api';
import type { CollectionMetadatum, ProductMetadatum } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';
import { normalizePayloadDoc } from './_normalize-payload';

export type MetadataApiArgs = { shop: OnlineShop; locale: Locale; handle: string };

/**
 * CMS metadata overlay for a Shopify product handle. The returned doc carries
 * descriptionOverride (Lexical rich text), supplemental render blocks, and
 * SEO field overrides — applied on top of the Shopify product page.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for Payload field resolution.
 * @param options.handle - Shopify product handle to look up in the CMS.
 * @returns The normalized product metadata overlay, or `null` when no entry exists.
 */
export async function ProductMetadataApi({ shop, locale, handle }: MetadataApiArgs): Promise<ProductMetadatum | null> {
    const meta = await getProductMetadata({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        shopifyHandle: handle,
    });
    return meta ? normalizePayloadDoc(meta, locale.code) : null;
}

/**
 * CMS metadata overlay for a Shopify collection handle. Same overlay
 * semantics as `ProductMetadataApi`.
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
    const meta = await getCollectionMetadata({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        shopifyHandle: handle,
    });
    return meta ? normalizePayloadDoc(meta, locale.code) : null;
}
