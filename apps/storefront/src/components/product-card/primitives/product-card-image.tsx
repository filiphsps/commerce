import type { Product, ProductVariant } from '@/api/product';
import { VariantImage } from '@/components/product-display';

export type ProductCardImageProps = {
    product: Product;
    seedVariant: ProductVariant;
    priority?: boolean;
    aspect?: 'vertical' | 'horizontal' | 'micro' | 'square';
    className?: string;
};

const ProductCardImage = (props: ProductCardImageProps) => <VariantImage {...props} />;

ProductCardImage.displayName = 'Nordcom.ProductCard.Image';
export default ProductCardImage;
