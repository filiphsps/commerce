'use client';

import styles from '@/components/product-card/product-card.module.scss';

import { QuantitySelector } from '@/components/products/quantity-selector';

import type { ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardFooterProps = {
    i18n: LocaleDictionary;

    selectedVariant: ProductVariant;
    quantity: number;
    setQuantity: (value: number) => void;
};

const ProductCardFooterQuantity = ({ i18n, selectedVariant, quantity, setQuantity }: ProductCardFooterProps) => {
    return (
        <QuantitySelector
            className={styles.quantity}
            i18n={i18n}
            value={quantity}
            update={setQuantity}
            disabled={!selectedVariant.availableForSale}
        />
    );
};

ProductCardFooterQuantity.displayName = 'Nordcom.ProductCard.Quantity';
export default ProductCardFooterQuantity;
