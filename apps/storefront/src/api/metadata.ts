import 'server-only';

import { getCollectionMetadata, getProductMetadata } from '@nordcom/commerce-cms/api';
import type { CollectionMetadatum, ProductMetadatum } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';
import { draftMode } from 'next/headers';
import type { Locale } from '@/utils/locale';
import { toShopRef } from './_cms';

export type MetadataApiArgs = { shop: OnlineShop; locale: Locale; handle: string };

/**
 * CMS metadata overlay for a Shopify product handle. The returned doc carries
 * descriptionOverride (Lexical rich text), supplemental render blocks, and
 * SEO field overrides — applied on top of the Shopify product page.
 */
export async function ProductMetadataApi({ shop, locale, handle }: MetadataApiArgs): Promise<ProductMetadatum | null> {
    const isDraft = (await draftMode()).isEnabled;
    return getProductMetadata({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        shopifyHandle: handle,
        draft: isDraft,
    });
}

/**
 * CMS metadata overlay for a Shopify collection handle. Same overlay
 * semantics as `ProductMetadataApi`.
 */
export async function CollectionMetadataApi({
    shop,
    locale,
    handle,
}: MetadataApiArgs): Promise<CollectionMetadatum | null> {
    const isDraft = (await draftMode()).isEnabled;
    return getCollectionMetadata({
        shop: toShopRef(shop),
        locale: { code: locale.code },
        shopifyHandle: handle,
        draft: isDraft,
    });
}
