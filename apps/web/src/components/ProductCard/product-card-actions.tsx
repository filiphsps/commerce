'use client';

import styles from '@/components/ProductCard/product-card.module.scss';
import AddToCart from '@/components/products/add-to-cart';
import { QuantitySelector } from '@/components/products/quantity-selector';
import Pricing from '@/components/typography/pricing';
import { deepEqual } from '@/utils/deep-equal';
import type { LocaleDictionary } from '@/utils/locale';
import { useProduct } from '@shopify/hydrogen-react';
import { memo, useState } from 'react';

export type ProductCardActionsProps = {
    i18n: LocaleDictionary;
};

const ProductCardActions = memo(({ i18n }: ProductCardActionsProps) => {
    const { selectedVariant } = useProduct();
    const [quantity, setQuantity] = useState(1);

    if (!selectedVariant) return null;

    return (
        <div className={styles.actions}>
            <div className={styles['quantity-action']}>
                <Pricing price={selectedVariant.price as any} compareAtPrice={selectedVariant.compareAtPrice as any} />

                {selectedVariant.availableForSale ? (
                    <QuantitySelector
                        className={styles.quantity}
                        i18n={i18n}
                        value={quantity}
                        update={(value) => {
                            if (value === quantity) return;
                            setQuantity(value);
                        }}
                    />
                ) : null}
            </div>

            <AddToCart
                className={styles.button}
                quantity={quantity}
                i18n={i18n}
                disabled={!!selectedVariant.availableForSale}
            />
        </div>
    );
}, deepEqual);

ProductCardActions.displayName = 'Nordcom.ProductCard.Actions';
export default ProductCardActions;
