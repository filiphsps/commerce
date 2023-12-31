'use client';

import type { Product, ProductVariant } from '@/api/product';
import styles from '@/components/product-card/product-card.module.scss';
import AddToCart from '@/components/products/add-to-cart';
import { QuantitySelector } from '@/components/products/quantity-selector';
import Pricing from '@/components/typography/pricing';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useCallback, useState } from 'react';

export type ProductCardFooterProps = {
    locale: Locale;
    i18n: LocaleDictionary;

    selectedVariant: ProductVariant;
    data: Product;
};

const ProductCardFooter = ({ locale, i18n, data: product, selectedVariant }: ProductCardFooterProps) => {
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
            <div className={styles['quantity-action']}>
                <Pricing price={selectedVariant.price as any} compareAtPrice={selectedVariant.compareAtPrice as any} />

                {selectedVariant.availableForSale ? (
                    <QuantitySelector className={styles.quantity} i18n={i18n} value={quantity} update={update} />
                ) : null}
            </div>

            <AddToCart
                locale={locale}
                i18n={i18n}
                className={styles.button}
                quantity={quantity}
                disabled={!product?.availableForSale || !selectedVariant.availableForSale}
                data={product}
                variant={selectedVariant}
            />
        </div>
    );
};

ProductCardFooter.displayName = 'Nordcom.ProductCard.Footer';
export default ProductCardFooter;
