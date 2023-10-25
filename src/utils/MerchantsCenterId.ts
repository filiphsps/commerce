import type { Locale } from '@/utils/Locale';
import type { ShopifyAnalyticsProduct } from '@shopify/hydrogen-react';
import { parseGid } from '@shopify/hydrogen-react';

/***
 * This function is used to generate a unique ID for a product in the Merchants Center.
 *
 * @param {Locale} locale - The locale of the product.
 * @param {string} productId - The Shopify GID of the product.
 * @param {string} variantId - The Shopify GID of the variant.
 * @returns {string} A unique ID for the product in the Merchants Center.
 */
export const ProductToMerchantsCenterId = ({
    locale,
    product
}: {
    locale: Locale;
    product: ShopifyAnalyticsProduct;
}) => {
    const productId = parseGid(product.productGid).resourceId;
    const variantId = parseGid(product.variantGid).resourceId;

    return `shopify_${locale.country}_${productId}_${variantId}`;
};
