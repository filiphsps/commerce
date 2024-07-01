'use client';

import { useCallback, useEffect, useState } from 'react';

import { type LocaleDictionary, useTranslation } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';

import AddToCart from '../products/add-to-cart';

import type { Product, ProductVariant } from '@/api/product';
import type { CartLine } from '@shopify/hydrogen-react/storefront-api-types';

export type ProductCardActionsProps = {
    i18n: LocaleDictionary;

    selectedVariant: ProductVariant;
    data: Product;
};

const ProductCardActions = ({ i18n, data: product, selectedVariant }: ProductCardActionsProps) => {
    const { lines, linesUpdate, cartReady } = useCart();

    const { t } = useTranslation('common', i18n);
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
        [linesUpdate, lines]
    );

    const baseStyles = 'rounded-xl p-2 font-semibold overflow-hidden h-10';

    if (line) {
        return (
            <div
                className={cn(
                    baseStyles,
                    'border-primary flex border-2 border-solid bg-white p-0 font-bold *:appearance-none *:text-center *:transition-colors'
                )}
            >
                <button
                    title={t('decrease')}
                    disabled={!cartReady || quantity < 1}
                    className="active:bg-primary active:text-primary-foreground hover:bg-primary hover:text-primary-foreground w-14 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-inherit disabled:opacity-25"
                    onClick={() => update(quantity - 1)}
                >
                    -
                </button>
                <input
                    type="number"
                    min="1"
                    disabled={!cartReady}
                    className="h-full w-full disabled:opacity-25"
                    value={quantity}
                    onChange={({ target: { value } }) => setQuantity(Number.parseInt(value) || 0)}
                    onBlur={() => update(quantity)}
                />
                <button
                    title={t('increase')}
                    disabled={!cartReady}
                    className="active:bg-primary active:text-primary-foreground hover:bg-primary hover:text-primary-foreground w-14"
                    onClick={() => update(quantity + 1)}
                >
                    +
                </button>
            </div>
        );
    }

    return (
        <AddToCart
            className={cn(baseStyles, 'bg-primary text-primary-foreground flex w-full items-center justify-center')}
            quantity={1}
            data={product}
            variant={selectedVariant}
            i18n={i18n}
        />
    );
};

ProductCardActions.displayName = 'Nordcom.ProductCard.Actions';
export default ProductCardActions;
