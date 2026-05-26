import type { ProductVariant } from '@/api/product';

export function computeSalePercent(variant: ProductVariant | undefined | null): number | null {
    if (!variant?.compareAtPrice || !variant.price) return null;
    const compare = Number(variant.compareAtPrice.amount);
    const price = Number(variant.price.amount);
    if (!compare || compare <= price) return null;
    return Math.round(((compare - price) / compare) * 100);
}
