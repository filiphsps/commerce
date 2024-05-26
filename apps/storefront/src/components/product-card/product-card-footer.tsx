'use client';

import styles from '@/components/product-card/product-card.module.scss';

import { useCallback, useState } from 'react';

import { useCart } from '@shopify/hydrogen-react';

import AddToCart from '@/components/products/add-to-cart';
import { QuantitySelector } from '@/components/products/quantity-selector';
import Pricing from '@/components/typography/pricing';

import type { Product, ProductVariant } from '@/api/product';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ProductCardFooterProps = {
    locale: Locale;
    i18n: LocaleDictionary;

    selectedVariant: ProductVariant;
    data: Product;
};

const ProductCardFooter = ({ locale, i18n, data: product, selectedVariant }: ProductCardFooterProps) => {
    const { status, linesAdd } = useCart();

    const [quantity, setQuantity] = useState<number>(1);
    const update = useCallback(
        (value: number) => {
            if (value === quantity) return;
            setQuantity(value);
        },
        [quantity]
    );

    const ready = ['idle', 'uninitialized'].includes(status) || !selectedVariant;
    if (!selectedVariant) return null;

    return (
        <div className={styles.actions}>
            <div className={styles['quantity-action']}>
                <Pricing price={selectedVariant.price as any} compareAtPrice={selectedVariant.compareAtPrice as any} />

                <QuantitySelector
                    className={styles.quantity}
                    i18n={i18n}
                    value={quantity}
                    update={update}
                    disabled={!ready || !selectedVariant.availableForSale}
                />
            </div>

            <AddToCart
                locale={locale}
                i18n={i18n}
                className={styles.button}
                quantity={quantity}
                disabled={!ready || !(product.availableForSale || selectedVariant.availableForSale)}
                data={product}
                variant={selectedVariant}
            />
        </div>
    );
};

ProductCardFooter.displayName = 'Nordcom.ProductCard.Footer';
export default ProductCardFooter;
