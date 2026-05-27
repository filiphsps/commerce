import 'server-only';

import type { ShopRef } from '@nordcom/commerce-cms/api';
import type { Media } from '@nordcom/commerce-cms/types';
import type { OnlineShop } from '@nordcom/commerce-db';

/**
 * Build the `ShopRef` shape `@nordcom/commerce-cms/api` expects from an OnlineShop.
 *
 * @param shop - Tenant record to adapt.
 * @returns The corresponding `ShopRef` used by CMS API helpers.
 */
export const toShopRef = (shop: OnlineShop): ShopRef => ({
    id: shop.id,
    domain: shop.domain,
    i18n: { defaultLocale: shop.i18n?.defaultLocale ?? 'en-US' },
});

/**
 * Narrow a Payload upload field (`string | Media | null | undefined`) to a populated
 * `Media` or `null`. With `depth >= 1` on the underlying find, upload relations
 * arrive populated as objects; unset uploads come through as `null`. A bare string
 * id means the depth wasn't enough to populate this hop — treat as no data.
 *
 * @param v - Raw Payload upload field value.
 * @returns The populated `Media` object, or `null` when unpopulated or absent.
 */
export const populatedMedia = (v: string | Media | null | undefined): Media | null =>
    v && typeof v !== 'string' ? v : null;

/**
 * Narrow the tenant field (`string | Tenant | null | undefined`) to its id, or null.
 * Used for cache-key purposes and audit logging.
 *
 * @param v - Raw tenant field from a Payload document.
 * @returns The tenant id string, or `null` when absent.
 */
export const tenantId = (v: string | { id: string } | null | undefined): string | null =>
    typeof v === 'string' ? v : (v?.id ?? null);
