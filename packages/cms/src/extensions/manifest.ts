/**
 * The per-shop extension manifest contract. The authoritative type now lives in the db package
 * (`@nordcom/commerce-db/lib/extensions`) so it can sit on `ShopBase.extensions` AND be consumed by
 * this CMS-safe resolver without a dependency cycle (cms → db is the allowed direction). Re-exported
 * here so `@nordcom/commerce-cms/extensions` and `resolve.ts` keep importing from `./manifest`
 * unchanged. The Block-loader firewall stays intact — db's theme/extension leaves are CMS-safe and
 * carry no React/Shopify/server-only dependency.
 */
export type { ProductCardVariantSelection, ShopExtensionManifest } from '@nordcom/commerce-db/lib/extensions';
