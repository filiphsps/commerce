import type { ShopifyAnalyticsProduct } from '@shopify/hydrogen-react';
import { parseGid } from '@shopify/hydrogen-react';

export const ProductToMerchantsCenterId = ({
    locale,
    productId,
    variantId
}: {
    locale?: string;
    productId: string;
    variantId: string;
}) => {
    const product = parseGid(productId).resourceId;
    const variant = parseGid(variantId).resourceId;
    const country = (locale?.split?.('-')?.[1] || 'US').toUpperCase();

    return `shopify_${country}_${product}_${variant}`;
};
