import type { Product, ProductVariant } from '@shopify/hydrogen-react/storefront-api-types';

/**
 * Find the first available and most expensive variant for a product.
 *
 * @param {Product} product - The product data.
 * @returns {ProductVariant} The recommended variant based on availability and price.
 */
export const FirstAvailableVariant = (product?: Product | null): ProductVariant | undefined => {
    // 1. Make sure we got a product passed to us.
    if (!product || !product?.variants?.edges) return undefined;

    // 2. Check if the last variant is available.
    if (product?.variants.edges.at(-1)?.node.availableForSale)
        // 2.1. If it is, return it.
        return product?.variants.edges.at(-1)!.node!;
    // 2.2. If it isn't, continue.

    // 3. Loop through the variants in reverse to get the more expensive variants first.
    for (let i = product?.variants.edges.length - 1; i >= 0; i--) {
        const variant = product?.variants.edges[i]?.node;

        // 3.1. If the variant is not available, continue.
        if (!variant || variant.availableForSale === false) continue;

        // 3.2. If the variant is available, return it.
        return variant;
    }

    // 4. If no variants are available, return the most expensive one.
    return product?.variants.edges.at(-1)!.node!;
};
