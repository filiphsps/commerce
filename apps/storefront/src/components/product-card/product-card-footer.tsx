'use client';

import styles from '@/components/product-card/product-card.module.scss';

import { useCallback, useState } from 'react';

import AddToCart from '@/components/products/add-to-cart';

import ProductCardFooterQuantity from './product-card-footer-quantity';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardFooterProps = {
    i18n: LocaleDictionary;

    selectedVariant: ProductVariant;
    data: Product;
};

const ProductCardFooter = ({ i18n, data: product, selectedVariant }: ProductCardFooterProps) => {
    const [quantity, setQuantity] = useState<number>(1);
    const update = useCallback(
        (value: number) => {
            if (value === quantity) return;
            setQuantity(value);
        },
        [quantity]
    );

    if (!selectedVariant) return null;

    return (
        <div className={styles.actions}>
            <ProductCardFooterQuantity
                i18n={i18n}
                selectedVariant={selectedVariant}
                quantity={quantity}
                setQuantity={update}
            />

            <AddToCart
                i18n={i18n}
                className={styles.button}
                quantity={quantity}
                data={product}
                variant={selectedVariant}
            />
        </div>
    );
};

ProductCardFooter.displayName = 'Nordcom.ProductCard.Footer';
export default ProductCardFooter;
