'use client';

import styles from '@/components/product-card/product-card.module.scss';

import { useCallback, useState } from 'react';
import { FiShoppingCart } from 'react-icons/fi';

import AddToCart from '@/components/products/add-to-cart';

import ProductCardQuantity from './product-card-quantity';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardActionsProps = {
    i18n: LocaleDictionary;

    selectedVariant: ProductVariant;
    data: Product;
};

const ProductCardActions = ({ i18n, data: product, selectedVariant }: ProductCardActionsProps) => {
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
            <ProductCardQuantity
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
            >
                <FiShoppingCart />
            </AddToCart>
        </div>
    );
};

ProductCardActions.displayName = 'Nordcom.ProductCard.Actions';
export default ProductCardActions;
