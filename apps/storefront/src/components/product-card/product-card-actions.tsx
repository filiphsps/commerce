'use client';

import { useCallback, useEffect, useState } from 'react';

import { type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';

import AddToCart from '@/components/products/add-to-cart';
import { QuantitySelector } from '@/components/products/quantity-selector';

import type { Product, ProductVariant } from '@/api/product';
import type { CartLine } from '@shopify/hydrogen-react/storefront-api-types';

export type ProductCardActionsProps = {
    i18n: LocaleDictionary;

    selectedVariant: ProductVariant;
    data: Product;
};

const ProductCardActions = ({ i18n, data: product, selectedVariant }: ProductCardActionsProps) => {
    const { lines, linesUpdate, cartReady } = useCart();

    const line = (lines as CartLine[]).find(({ merchandise: { id } }) => id === selectedVariant.id) ?? null;

    const [quantity, setQuantity] = useState<number>(1);
    useEffect(() => {
        if (!line) return;

        setQuantity(line.quantity);
    }, [line, line?.quantity]);

    const update = useCallback(
        (quantity: number) => {
            if (!lines || !line || quantity === line.quantity) {
                return;
            }

            linesUpdate([
                {
                    id: line.id,
                    quantity
                }
            ]);
        },
        [lines, line, linesUpdate]
    );

    if (cartReady === undefined) {
        return null;
    }

    const baseStyles = 'font-semibold overflow-hidden *:h-9 mt-1 h-10 min-h-10 max-h-10 grow rounded-lg drop-shadow';
    if (line) {
        return (
            <>
                <QuantitySelector
                    disabled={!cartReady}
                    className={cn(baseStyles, 'bg-white')}
                    i18n={i18n}
                    value={quantity}
                    update={update}
                    allowDecreaseToZero={true}
                />
            </>
        );
    }

    return (
        <AddToCart
            className={cn(
                baseStyles,
                'bg-primary text-primary-foreground flex w-full transform-gpu items-center justify-center'
            )}
            quantity={1}
            data={{
                product,
                selectedVariant
            }}
            disabled={!cartReady}
            i18n={i18n}
        />
    );
};

ProductCardActions.displayName = 'Nordcom.ProductCard.Actions';
export default ProductCardActions;
