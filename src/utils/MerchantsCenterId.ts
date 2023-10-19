export const ProductToMerchantsCenterId = ({
    locale,
    productId,
    variantId
}: {
    locale?: string;
    productId: string;
    variantId: string;
}) => {
    // FIXME: Tests for this!
    return `shopify_${locale?.split('-')[1] || 'US'}_${productId.split('/').at(-1)}_${variantId.split('/').at(-1)}`;
};
