import { parseGid } from '@shopify/hydrogen-react';

import type { Locale } from '@/utils/locale';

/**
 * This function is used to generate a unique ID for a product in the Merchants Center.
 *
 * @param options - The options.
 * @param [options.locale] - The locale of the product.
 * @param [options.product] - The product.
 * @param [options.product.productGid] - The Shopify GID of the product.
 * @param [options.product.variantGid] - The Shopify GID of the variant.
 * @returns A unique ID for the product in the Merchants Center.
 */
export const productToMerchantsCenterId = ({
    locale,
    product,
}: {
    locale: Locale;
    product: {
        productGid: string;
        variantGid?: string;
    };
}) => {
    const productId = parseGid(product.productGid).resourceId;

    const id = `shopify_${locale.country?.toUpperCase()}_${productId}`;

    if (!product.variantGid) {
        return id;
    }

    const variantId = parseGid(product.variantGid).resourceId;
    return `${id}_${variantId}`;
};
