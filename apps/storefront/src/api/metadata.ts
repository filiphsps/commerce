import 'server-only';

import type { CollectionMetadatum, ProductMetadatum } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import type { Locale } from '@/utils/locale';
import { cmsRead } from './_cms-read';
import { isDraftModeEnabled } from './_draft';

export type MetadataApiArgs = { shop: OnlineShop; locale: Locale; handle: string };

/**
 * CMS metadata overlay for a Shopify product handle, read from the Convex
 * `cms/read:productMetadataByHandle` query (resolved by the same
 * Shopify-handle natural key the contract froze). The returned doc carries
 * descriptionOverride (ProseMirror rich text), supplemental render blocks, and
 * SEO field overrides — applied on top of the Shopify product page. A
 * draft-mode request carries the draft flag.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for CMS field resolution.
 * @param options.handle - Shopify product handle to look up in the CMS.
 * @returns The contract-shaped product metadata overlay, or `null` when no entry exists.
 */
export async function ProductMetadataApi({ shop, locale, handle }: MetadataApiArgs): Promise<ProductMetadatum | null> {
    const draft = await isDraftModeEnabled();
    return (await cmsRead('cms/read:productMetadataByHandle', {
        shopId: shop.id,
        handle,
        locale: locale.code,
        ...(draft ? { draft: true } : {}),
    })) as ProductMetadatum | null;
}

/**
 * CMS metadata overlay for a Shopify collection handle — same overlay
 * semantics as `ProductMetadataApi`, read from the Convex
 * `cms/read:collectionMetadataByHandle` query, including the draft-mode
 * forwarding.
 *
 * @param options - Fetch options.
 * @param options.shop - Tenant record.
 * @param options.locale - Request locale for CMS field resolution.
 * @param options.handle - Shopify collection handle to look up in the CMS.
 * @returns The contract-shaped collection metadata overlay, or `null` when no entry exists.
 */
export async function CollectionMetadataApi({
    shop,
    locale,
    handle,
}: MetadataApiArgs): Promise<CollectionMetadatum | null> {
    const draft = await isDraftModeEnabled();
    return (await cmsRead('cms/read:collectionMetadataByHandle', {
        shopId: shop.id,
        handle,
        locale: locale.code,
        ...(draft ? { draft: true } : {}),
    })) as CollectionMetadatum | null;
}
