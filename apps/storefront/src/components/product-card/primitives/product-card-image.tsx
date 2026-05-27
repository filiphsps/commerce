import type { Product, ProductVariant } from '@/api/product';
import { VariantImage } from '@/components/product-display';

export type ProductCardImageProps = {
    product: Product;
    seedVariant: ProductVariant;
    priority?: boolean;
    aspect?: 'vertical' | 'horizontal' | 'square';
    className?: string;
};

/**
 * Thin wrapper that forwards product-card image props to `VariantImage`.
 *
 * @param props.product - Product containing variant image data.
 * @param props.seedVariant - Initial variant whose image is shown before selection.
 * @param props.priority - When `true`, loads the primary image eagerly.
 * @param props.aspect - Aspect ratio applied to the image container.
 * @param props.className - Additional CSS class names.
 * @returns The `VariantImage` element.
 */
const ProductCardImage = (props: ProductCardImageProps) => <VariantImage {...props} />;

ProductCardImage.displayName = 'Nordcom.ProductCard.Image';
export default ProductCardImage;
