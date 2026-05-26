import type { ProductVariant } from '@/api/product';

/**
 * Whether a variant is currently on sale — i.e. its `compareAtPrice` is set
 * and strictly higher than `price`. Single source of truth for the
 * sale-state predicate consumed by `ProductCardPrice` (which sets
 * `data-on-sale` locally) and the orchestrator (which mirrors it onto
 * `ProductCardRoot` so `group-data-[on-sale]/card:` selectors resolve).
 *
 * @param variant - The variant under inspection. `null`/`undefined` returns `false`.
 * @returns `true` when `compareAtPrice > price`, otherwise `false`.
 */
export function isVariantOnSale(variant: ProductVariant | undefined | null): boolean {
    if (!variant?.compareAtPrice || !variant.price) return false;
    return Number(variant.compareAtPrice.amount) > Number(variant.price.amount);
}

/**
 * Sale percentage in whole-percent points, or `null` when the variant is
 * not on sale.
 *
 * @param variant - The variant under inspection.
 * @returns Rounded percent (e.g. `25`) or `null`.
 */
export function computeSalePercent(variant: ProductVariant | undefined | null): number | null {
    if (!isVariantOnSale(variant)) return null;
    const compare = Number(variant!.compareAtPrice!.amount);
    const price = Number(variant!.price.amount);
    return Math.round(((compare - price) / compare) * 100);
}
