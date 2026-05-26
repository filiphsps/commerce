import ProductCardBase from './product-card';

export { COMMON_BADGE_STYLES } from '@/components/product-display/primitives/badge-styles';
export type { ProductCardChrome, ProductCardLayout } from './primitives/product-card-root';
export type { ProductCardData, ProductCardProps } from './product-card';
export { toProductCardData } from './product-card';

// Phase 3 cleanup: primitives that used to be re-exported via dot-access
// (ProductCard.Root, ProductCard.Actions, ProductCard.Overlay, etc.) are
// either deleted (Actions, ActionsClient, Options, Overlay) or accessed
// via their own direct imports (Root, Image, Title, Price, Badges,
// StockUrgency). The orchestrator is the public surface; consumers import
// primitives directly when composing surface-specific variants.

const ProductCard = Object.assign(ProductCardBase, {});
ProductCard.skeleton = ProductCardBase.skeleton;

export { ProductCard };
export default ProductCard;
