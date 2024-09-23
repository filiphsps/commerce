import { NotFoundError } from '@nordcom/commerce-errors';

import type { Product, ProductVariant } from '@/api/product';

/**
 * Find the first available and most suitable variant for a specific product.
 *
 * @param {Product} product - The product data.
 * @returns {ProductVariant} The recommended variant based on availability and price.
 */
export const firstAvailableVariant = (product?: Product | null): ProductVariant | undefined => {
    // 1. Make sure we got a product passed to us.
    if (!product?.variants) {
        return undefined;
    }

    const variants: ProductVariant[] =
        ((product.variants.edges as any)
            ? product.variants.edges.map(({ node: variant }) => variant)
            : (product.variants as any)) || [];

    if (variants.length <= 0) {
        throw new NotFoundError(`"product.variant"`);
    }

    // 2. Check if the last variant is available.
    if (variants.at(-1)?.availableForSale) {
        // 2.1. If it is, return it.
        return variants.at(-1)!;
    }
    // 2.2. If it isn't, continue.

    // 3. Loop through the variants in reverse to get the more expensive variants first.
    for (let i = variants.length - 1; i >= 0; i--) {
        const variant = variants[i] as (typeof variants)[number] | undefined;

        // 3.1. If the variant is not available, continue.
        if (!variant?.availableForSale) {
            continue;
        }

        // 3.2. If the variant is available, return it.
        return variant;
    }

    // 4. If no variants are available, return the most expensive one.
    return variants.at(-1)!;
};
