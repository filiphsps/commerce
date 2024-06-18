'use client';

import styles from '@/components/product-card/product-card.module.scss';

import { Suspense, useCallback, useState } from 'react';

import AddToCart from '@/components/products/add-to-cart';
import { useShop } from '@/components/shop/provider';

import ProductCardFooterQuantity from './product-card-footer-quantity';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';

export type ProductCardFooterProps = {
    i18n: LocaleDictionary;

    selectedVariant: ProductVariant;
    data: Product;
};

const ProductCardFooter = ({ i18n, data: product, selectedVariant }: ProductCardFooterProps) => {
    const { shop } = useShop();

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
            <Suspense key={`${shop.id}.product-card.footer.quantity`}>
                <ProductCardFooterQuantity
                    i18n={i18n}
                    selectedVariant={selectedVariant}
                    quantity={quantity}
                    setQuantity={update}
                />
            </Suspense>

            <Suspense key={`${shop.id}.product-card.footer.add-to-cart`} fallback={<AddToCart.skeleton />}>
                <AddToCart
                    i18n={i18n}
                    className={styles.button}
                    quantity={quantity}
                    data={product}
                    variant={selectedVariant}
                />
            </Suspense>
        </div>
    );
};

ProductCardFooter.displayName = 'Nordcom.ProductCard.Footer';
export default ProductCardFooter;
