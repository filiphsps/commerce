'use client';

import styles from '@/components/product-card/product-card.module.scss';

import { Suspense, useCallback, useState } from 'react';

import { useCart } from '@shopify/hydrogen-react';

import AddToCart from '@/components/products/add-to-cart';
import { QuantitySelector } from '@/components/products/quantity-selector';
import Pricing from '@/components/typography/pricing';

import { useShop } from '../shop/provider';

import type { Product, ProductVariant } from '@/api/product';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ProductCardFooterProps = {
    locale: Locale;
    i18n: LocaleDictionary;

    selectedVariant: ProductVariant;
    data: Product;
};

const ProductCardFooter = ({ locale, i18n, data: product, selectedVariant }: ProductCardFooterProps) => {
    const { cartReady } = useCart();
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
            <div className={styles['quantity-action']}>
                <Pricing price={selectedVariant.price as any} compareAtPrice={selectedVariant.compareAtPrice as any} />

                <QuantitySelector
                    className={styles.quantity}
                    i18n={i18n}
                    value={quantity}
                    update={update}
                    disabled={!cartReady || !selectedVariant.availableForSale}
                />
            </div>

            <Suspense key={`${shop.id}.product-card.footer.add-to-cart`}>
                <AddToCart
                    locale={locale}
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
