import type { Locale } from '@/utils/locale';
import { parseGid } from '@shopify/hydrogen-react';

/**
 * This function is used to generate a unique ID for a product in the Merchants Center.
 *
 * @param {object} options - The options.
 * @param {Locale} [options.locale] - The locale of the product.
 * @param {object} [options.product] - The product.
 * @param {string} [options.product.productGid] - The Shopify GID of the product.
 * @param {string} [options.product.variantGid] - The Shopify GID of the variant.
 * @returns {string} A unique ID for the product in the Merchants Center.
 */
export const ProductToMerchantsCenterId = ({
    locale,
    product
}: {
    locale: Locale;
    product: {
        productGid: string;
        variantGid: string;
    };
}) => {
    const productId = parseGid(product.productGid).resourceId;
    const variantId = parseGid(product.variantGid).resourceId;

    return `shopify_${locale.country?.toUpperCase()}_${productId}_${variantId}`;
};
