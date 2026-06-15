import 'server-only';

import { type ResolvedExtensions, resolveExtensions } from '@nordcom/commerce-cms/extensions';
import type { OnlineShop } from '@nordcom/commerce-db';
import {
    type ProductCardSurfaceOverride,
    type ProductCardSurfacePreset,
    resolveProductCardSurface,
} from '@/components/product-card/presets';

/**
 * Resolves the per-shop extension config for the current tenant. The manifest persists on the shop
 * row (`shop.extensions`); an absent manifest resolves byte-identically to today's render. Pure and
 * synchronous — the shop is already loaded by the caller, so this just composes the manifest over
 * the platform defaults.
 *
 * @param shop - The tenant shop record (carries `extensions`, `theme`, `design`).
 * @returns The resolved extensions: theme, chrome, section predicate, block availability, and
 *   per-surface product-card variant selections.
 */
export function ResolvedExtensionsApi({ shop }: { shop: OnlineShop }): ResolvedExtensions {
    return resolveExtensions({ shop, manifest: shop.extensions ?? null });
}

/**
 * Resolves the effective product-card surface configuration for a shop, layering the store-default
 * variant selection (`extensions.productCard[surface]`) over the surface preset over the built-in
 * fallback. An absent selection resolves byte-identically to the current preset. The variant
 * selection's open `string` names are narrowed to the surface-override shape — the
 * component-settings registry constrains the authored values to valid built-ins, and the
 * storefront variant registries degrade gracefully on any unknown name.
 *
 * @param shop - The tenant shop record.
 * @param surface - Surface key (`collection`, `search`, `recommendation`).
 * @returns The fully-resolved surface configuration.
 */
export function productCardSurfaceForShop(shop: OnlineShop, surface: string): ProductCardSurfacePreset {
    const selection = ResolvedExtensionsApi({ shop }).productCard[surface] as ProductCardSurfaceOverride | undefined;
    return resolveProductCardSurface(surface, selection);
}
