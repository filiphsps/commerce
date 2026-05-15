import type { Product } from '@/api/product';

type OptionValueLike = string | { name?: string | null | undefined };

type OptionLike = {
    name?: string | null;
    values?: ReadonlyArray<string | null | undefined> | null;
    optionValues?: ReadonlyArray<OptionValueLike> | null;
};

const readValueNames = (option: OptionLike): string[] => {
    // Prefer the modern `optionValues` shape (from getProductOptions);
    // fall back to legacy `values` (from raw Storefront API products).
    if (option.optionValues && option.optionValues.length > 0) {
        return option.optionValues
            .map((v) => (typeof v === 'string' ? v : (v?.name ?? '')))
            .filter((s): s is string => Boolean(s));
    }
    if (option.values) {
        return option.values.filter((v): v is string => Boolean(v));
    }
    return [];
};

/**
 * Strip Shopify's auto-inserted "Default Title" placeholder option groups.
 *
 * A placeholder is an option whose only value is exactly "Default Title"
 * (case-insensitive). Everything else passes through.
 *
 * Handles both the legacy `values: string[]` shape (raw Storefront API) and
 * the modern `optionValues: { name }[]` shape (hydrogen-react's
 * `getProductOptions` output). Used by both `hasProductOptions` (gate) and
 * `<ProductOptionsSelector>` (filter what to render).
 *
 * @param options - The option list from `product.options` or
 *                  `getProductOptions(product)`.
 * @returns Options with the Default Title placeholder removed.
 */
export const filterRealOptions = <T extends OptionLike>(options: T[] | null | undefined): T[] => {
    if (!options) {
        return [];
    }

    return options.filter((option) => {
        const valueNames = readValueNames(option);

        if (valueNames.length === 0) {
            return false;
        }

        if (valueNames.length === 1 && valueNames[0]!.toLowerCase() === 'default title') {
            return false;
        }

        return true;
    });
};

/**
 * Verify that a product exposes selectable options to the user.
 *
 * @param product - The product data.
 * @returns `true` when the product has at least one selectable choice, otherwise `false`.
 */
export const hasProductOptions = (product?: Product | null): boolean => {
    if (!product?.options) {
        return false;
    }

    const options = filterRealOptions(product.options);

    if (options.length <= 0) {
        return false;
    }

    if (options.length === 1) {
        const valueCount = readValueNames(options[0]!).length;
        if (valueCount <= 1) {
            return false;
        }
    }

    return true;
};
