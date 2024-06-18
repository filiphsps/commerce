'use client';

import styles from '@/components/product-card/product-card.module.scss';

import { QuantitySelector } from '@/components/products/quantity-selector';
import Pricing from '@/components/typography/pricing';

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
        <div className={styles['quantity-action']}>
            <Pricing price={selectedVariant.price as any} compareAtPrice={selectedVariant.compareAtPrice as any} />

            <QuantitySelector
                className={styles.quantity}
                i18n={i18n}
                value={quantity}
                update={setQuantity}
                disabled={!selectedVariant.availableForSale}
            />
        </div>
    );
};

ProductCardFooterQuantity.displayName = 'Nordcom.ProductCard.Footer.Quantity';
export default ProductCardFooterQuantity;
