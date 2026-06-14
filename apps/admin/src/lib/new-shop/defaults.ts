import type { AccentToken } from '@nordcom/commerce-db';

/**
 * Storefront API version pinned for connection-validation pings. Mirrors the Admin API version
 * (`ApiVersion.October25`) the Shopify OAuth integration already targets, so both halves of the
 * eventual "support both" surface speak the same Shopify version.
 */
export const SHOPIFY_STOREFRONT_API_VERSION = '2025-10';

/**
 * Locale prefilled in the wizard's Basics step. Anchors the shop-default arm of the
 * `request locale → shop default → platform default` fallback when the operator does not change it.
 */
export const DEFAULT_SHOP_LOCALE = 'en-US';

/**
 * Header logo written for every new shop. `src` is intentionally empty: the storefront header and
 * footer guard on `logo.src` (`apps/storefront/src/components/header/header.tsx:60`) and render
 * nothing for an empty string, so no broken image appears and the shop name stands in. Non-zero
 * dimensions keep the header's `aspect-ratio: width / height` CSS finite. Operators replace this in
 * settings/media after creation — the media pipeline is tenant-scoped and unavailable before the
 * shop (and its tenant) exist.
 */
export const DEFAULT_SHOP_LOGO = { width: 125, height: 50, src: '', alt: '' } as const;

/**
 * Accent set written when the operator skips branding. `THEME_DEFAULTS.colors.accents` is `[]`, so an
 * empty set resolves to the platform theme byte-identically (no migration, no surprise colors).
 */
export const DEFAULT_SHOP_ACCENTS: AccentToken[] = [];
