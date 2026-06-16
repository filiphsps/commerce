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
 * Resolves the effective product-card surface configuration for a shop, layering the per-surface
 * store selection (`extensions.productCard[surface]`) over the store-wide `base`
 * (`extensions.productCard.base`, applied to every surface) over the surface preset over the built-in
 * fallback. An absent selection and base resolve byte-identically to the current preset. The variant
 * selection's open `string` names are narrowed to the surface-override shape — the
 * component-settings registry constrains the authored values to valid built-ins, and the
 * storefront variant registries degrade gracefully on any unknown name.
 *
 * @param shop - The tenant shop record.
 * @param surface - Surface key (`collection`, `search`, `recommendation`).
 * @param instance - Optional per-instance override authored on the hosting block node; highest precedence.
 * @returns The fully-resolved surface configuration.
 */
export function productCardSurfaceForShop(
    shop: OnlineShop,
    surface: string,
    instance?: ProductCardSurfaceOverride,
): ProductCardSurfacePreset {
    const resolved = ResolvedExtensionsApi({ shop }).productCard;
    const selection = resolved[surface] as ProductCardSurfaceOverride | undefined;
    const base = resolved.base as ProductCardSurfaceOverride | undefined;
    return resolveProductCardSurface(surface, selection, base, instance);
}
