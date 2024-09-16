'use client';

import { Suspense } from 'react';

import { useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { useProduct } from '@shopify/hydrogen-react';

import AddToCart from '@/components/products/add-to-cart';
import { ProductOptions } from '@/components/products/product-options';
import { ProductQuantityBreaks } from '@/components/products/product-quantity-breaks';
import { useQuantity } from '@/components/products/quantity-provider';
import { QuantitySelector } from '@/components/products/quantity-selector';
import { Label } from '@/components/typography/label';

import type { Product, ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { HTMLProps } from 'react';

export type ProductActionsContainerProps = {
    i18n: LocaleDictionary;
    showQuantityBreaks?: boolean;
} & Omit<HTMLProps<HTMLDivElement>, 'children'>;

export const ProductActionsContainer = ({
    className,
    i18n,
    showQuantityBreaks = false,
    ...props
}: ProductActionsContainerProps) => {
    const { t } = useTranslation('common', i18n);
    const { quantity, setQuantity } = useQuantity();

    const { product, selectedVariant } = useProduct() as ReturnType<typeof useProduct> & {
        product: Product;
        selectedVariant: ProductVariant;
    };
    if (!(product as any)) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6">
            <div {...props} className={cn('flex flex-wrap gap-2', className)} suppressHydrationWarning={true}>
                <div className="flex flex-col gap-1" suppressHydrationWarning={true}>
                    <Label className="text-gray-600" style={{ gridArea: 'quantity-label' }}>
                        {t('quantity')}
                    </Label>

                    <QuantitySelector
                        update={(value) => {
                            if (value === quantity) {
                                return;
                            }
                            setQuantity(value);
                        }}
                        value={quantity}
                        i18n={i18n}
                        style={{ gridArea: 'quantity' }}
                        className="h-12 grow bg-white"
                        buttonClassName="disabled:opacity-0 bg-white"
                    />
                </div>

                <Suspense fallback={<div className="flex" data-skeleton />}>
                    <ProductOptions />
                </Suspense>
            </div>

            <Suspense>{showQuantityBreaks ? <ProductQuantityBreaks i18n={i18n} /> : null}</Suspense>

            <Suspense fallback={<AddToCart.skeleton />}>
                <AddToCart
                    className="py-3 text-base lg:py-4 lg:text-lg"
                    quantity={quantity}
                    i18n={i18n}
                    data={{
                        product,
                        selectedVariant
                    }}
                />
            </Suspense>
        </div>
    );
};
ProductActionsContainer.displayName = 'Nordcom.Products.ActionsContainer';
