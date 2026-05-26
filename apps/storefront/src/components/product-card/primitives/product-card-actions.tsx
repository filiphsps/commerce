import 'server-only';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import ProductCardActionsClient from './product-card-actions-client';

export type ProductCardActionsMode = 'full' | 'icon';

export type ProductCardActionsProps = {
    product: Product;
    seedVariant: ProductVariant;
    mode?: ProductCardActionsMode;
    i18n: LocaleDictionary;
};

const ProductCardActions = ({ product, seedVariant, mode = 'full', i18n }: ProductCardActionsProps) => {
    return <ProductCardActionsClient product={product} seedVariantId={seedVariant.id ?? ''} mode={mode} i18n={i18n} />;
};

ProductCardActions.displayName = 'Nordcom.ProductCard.Actions';
export default ProductCardActions;
