'use client';

import styles from '@/components/products/product-actions-container.module.scss';

import { Suspense, useState } from 'react';

import type { Shop } from '@nordcom/commerce-database';

import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { useProduct } from '@shopify/hydrogen-react';

import AddToCart from '@/components/products/add-to-cart';
import { ProductOptions, ProductOptionsSkeleton } from '@/components/products/product-options';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { Label } from '@/components/typography/label';

import type { LocaleDictionary } from '@/utils/locale';
import type { HTMLProps } from 'react';

export type ProductActionsContainerProps = {
    shop: Shop;
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;

export const ProductActionsContainer = ({ shop, className, i18n, ...props }: ProductActionsContainerProps) => {
    const { t } = useTranslation('common', i18n);
    const [quantity, setQuantity] = useState(1);

    const { product } = useProduct();
    if (!product) return null;

    return (
        <>
            <div {...props} className={cn(styles.options, className)}>
                <Label className="text-gray-600" style={{ gridArea: 'quantity-label' }}>
                    {t('quantity')}
                </Label>

                <QuantitySelector
                    update={(value) => {
                        if (value === quantity) return;
                        setQuantity(value);
                    }}
                    value={quantity}
                    i18n={i18n}
                    style={{ gridArea: 'quantity' }}
                    className="min-h-12"
                />

                <Suspense
                    key={`${shop.id}.${product.id}.product-actions.options`}
                    fallback={<ProductOptionsSkeleton />}
                >
                    <ProductOptions />
                </Suspense>
            </div>

            {/*<ProductQuantityBreaks />*/}

            <Suspense key={`${shop.id}.${product.id}.product-actions.add-to-cart`} fallback={<AddToCart.skeleton />}>
                <AddToCart className={styles.button} quantity={quantity} i18n={i18n} />
            </Suspense>
        </>
    );
};
ProductActionsContainer.displayName = 'Nordcom.Products.ActionsContainer';
