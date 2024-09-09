'use client';

import { Suspense, useState } from 'react';

import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { useProduct } from '@shopify/hydrogen-react';

import AddToCart from '@/components/products/add-to-cart';
import { ProductOptions } from '@/components/products/product-options';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { Label } from '@/components/typography/label';

import type { Product } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { HTMLProps } from 'react';

export type ProductActionsContainerProps = {
    i18n: LocaleDictionary;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;

export const ProductActionsContainer = ({ className, i18n, ...props }: ProductActionsContainerProps) => {
    const { t } = useTranslation('common', i18n);
    const [quantity, setQuantity] = useState(1);

    const { product } = useProduct() as ReturnType<typeof useProduct> & { product: Product };
    if (!(product as any)) {
        return null;
    }

    return (
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
                        buttonClassName="disabled:opacity-0 bg-white h-12"
                        inputClassName="h-12"
                    />
                </div>

                <Suspense fallback={<div className="flex" data-skeleton />}>
                    <ProductOptions />
                </Suspense>
            </div>

            {/*<ProductQuantityBreaks />*/}

            <Suspense fallback={<AddToCart.skeleton />}>
                <AddToCart className="py-3 text-base lg:py-4 lg:text-lg" quantity={quantity} i18n={i18n} />
            </Suspense>
        </div>
    );
};
ProductActionsContainer.displayName = 'Nordcom.Products.ActionsContainer';
