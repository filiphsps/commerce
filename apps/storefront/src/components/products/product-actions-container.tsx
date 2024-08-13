'use client';

import styles from '@/components/products/product-actions-container.module.scss';

import { Suspense, useState } from 'react';

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
    i18n: LocaleDictionary;
} & HTMLProps<HTMLDivElement>;

export const ProductActionsContainer = ({ className, i18n, children, ...props }: ProductActionsContainerProps) => {
    const { t } = useTranslation('common', i18n);
    const [quantity, setQuantity] = useState(1);

    const { product } = useProduct();
    if (!product) return null;

    return (
        <>
            <div className="flex flex-col gap-2">
                <div {...props} className={cn('flex flex-wrap gap-2', className)}>
                    <div className="flex flex-col gap-1">
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
                            className="h-12 bg-white"
                        />
                    </div>

                    <Suspense fallback={<ProductOptionsSkeleton />}>
                        <ProductOptions />
                    </Suspense>
                </div>

                {/*<ProductQuantityBreaks />*/}

                {children}
            </div>

            <Suspense fallback={<AddToCart.skeleton />}>
                <AddToCart className={cn(styles.button)} quantity={quantity} i18n={i18n} />
            </Suspense>
        </>
    );
};
ProductActionsContainer.displayName = 'Nordcom.Products.ActionsContainer';
