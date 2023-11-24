import type { Product, ProductVariant } from '@/api/product';
import { NotFoundError } from '@/utils/errors';

/**
 * Find the first available and most suitable variant for a specific product.
 *
 * @param {Product} product - The product data.
 * @returns {ProductVariant} The recommended variant based on availability and price.
 */
export const FirstAvailableVariant = (product?: Product | null): ProductVariant | undefined => {
    // 1. Make sure we got a product passed to us.
    if (!product || !product?.variants) return undefined;

    const variants: ProductVariant[] | undefined = product?.variants?.edges
        ? product?.variants?.edges?.map?.(({ node: variant }) => variant)
        : (product?.variants as any);

    if (!variants) throw new NotFoundError(`"product.variant"`);

    // 2. Check if the last variant is available.
    if (variants.at(-1)?.availableForSale)
        // 2.1. If it is, return it.
        return variants.at(-1)!;
    // 2.2. If it isn't, continue.

    // 3. Loop through the variants in reverse to get the more expensive variants first.
    for (let i = variants.length - 1; i >= 0; i--) {
        const variant = variants[i];

        // 3.1. If the variant is not available, continue.
        if (!variant || variant.availableForSale === false) continue;

        // 3.2. If the variant is available, return it.
        return variant;
    }

    // 4. If no variants are available, return the most expensive one.
    return variants.at(-1)!;
};
