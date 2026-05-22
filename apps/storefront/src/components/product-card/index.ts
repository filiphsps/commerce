import ProductCardActions from './primitives/product-card-actions';
import ProductCardBadges from './primitives/product-card-badges';
import ProductCardImage from './primitives/product-card-image';
import ProductCardOptions from './primitives/product-card-options';
import ProductCardOverlay from './primitives/product-card-overlay';
import ProductCardPrice from './primitives/product-card-price';
import ProductCardRoot from './primitives/product-card-root';
import ProductCardStockUrgency from './primitives/product-card-stock-urgency';
import ProductCardTitle from './primitives/product-card-title';
import ProductCardBase from './product-card';

export type { ProductCardVariant } from './context';
export { ALL_VARIANTS, DEFAULT_VARIANT, resolveVariant, useProductCardContext } from './context';
export { COMMON_BADGE_STYLES } from './primitives/product-card-badges';
export type { ProductCardProps } from './product-card';

const ProductCard = Object.assign(ProductCardBase, {
    Root: ProductCardRoot,
    Image: ProductCardImage,
    Title: ProductCardTitle,
    Price: ProductCardPrice,
    Options: ProductCardOptions,
    Actions: ProductCardActions,
    Badges: ProductCardBadges,
    Overlay: ProductCardOverlay,
    StockUrgency: ProductCardStockUrgency,
});

ProductCard.skeleton = ProductCardBase.skeleton;

export { ProductCard };
export default ProductCard;
