import type { Product } from '@/api/product';

/**
 * Verify that a product exposes selectable options to the user.
 *
 * Shopify always returns at least one option per product — for products with no real
 * variants it returns a single placeholder option named "Title" with the value
 * "Default Title". This helper filters that placeholder out and treats a single option
 * with a single value as "no real choice".
 *
 * @param product - The product data.
 * @returns `true` when the product has at least one selectable choice, otherwise `false`.
 */
export const hasProductOptions = (product?: Product | null): boolean => {
    // 1. Make sure we got a product passed to us.
    if (!product?.options) {
        return false;
    }

    // 2. Filter out Shopify's "Default Title" placeholder option.
    const options = product.options.filter(
        (option) =>
            option?.values && !(option.values.length === 1 && option.values[0]!.toLowerCase() === 'default title'),
    );

    // 3. No real options remain.
    if (options.length <= 0) {
        return false;
    }

    // 4. A single option with a single value isn't a real choice.
    if (options.length === 1 && options[0]!.values.length <= 1) {
        return false;
    }

    return true;
};
