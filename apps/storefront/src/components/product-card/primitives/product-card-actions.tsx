'use client';

import { useCart } from '@shopify/hydrogen-react';
import type { CartLine } from '@shopify/hydrogen-react/storefront-api-types';
import { Plus as PlusIcon } from 'lucide-react';
import { useCallback } from 'react';
import { useMaybeProductOptions } from '@/components/product-options/context';
import AddToCart from '@/components/products/add-to-cart';
import { QuantitySelector } from '@/components/products/quantity-selector';
import type { LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type ProductCardActionsMode = 'full' | 'icon';

export type ProductCardActionsProps = {
    i18n: LocaleDictionary;
    mode?: ProductCardActionsMode;
    className?: string;
};

const ProductCardActions = ({ i18n, mode = 'full', className }: ProductCardActionsProps) => {
    const ctx = useMaybeProductOptions();
    const product = ctx?.product;
    const selected = ctx?.selectedVariant;
    const { lines, linesUpdate, cartReady } = useCart();

    const line = (lines as CartLine[] | undefined)?.find(({ merchandise: { id } }) => id === selected?.id) ?? null;

    const quantity = line ? line.quantity : 1;

    const update = useCallback(
        (next: number) => {
            if (!lines || !line || next === line.quantity) {
                return;
            }
            linesUpdate([{ id: line.id, quantity: next }]);
        },
        [linesUpdate, lines, line],
    );

    if (cartReady === undefined || !product || !selected) {
        return null;
    }

    const baseStyles = cn(
        'overflow-hidden font-semibold transition-colors',
        'rounded-(--product-card-cta-radius)',
        '[transition-duration:var(--product-card-motion-hover-duration)]',
        '[transition-timing-function:var(--product-card-motion-hover-ease)]',
    );

    if (mode === 'icon') {
        const iconStyles = cn(
            baseStyles,
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            'bg-(--product-card-cta-bg) text-(--product-card-cta-color)',
            'hover:bg-(--product-card-cta-bg-hover)',
            'active:scale-95',
            className,
        );

        if (line) {
            return (
                <QuantitySelector
                    disabled={!cartReady}
                    className={cn(iconStyles, 'h-9 w-auto px-1')}
                    i18n={i18n}
                    value={quantity}
                    update={update}
                    allowDecreaseToZero={true}
                />
            );
        }

        return (
            <AddToCart
                className={iconStyles}
                quantity={1}
                data={{ product, selectedVariant: selected }}
                disabled={!cartReady}
                i18n={i18n}
                aria-label="Add to cart"
            >
                <PlusIcon className="h-4 w-4 stroke-2" />
            </AddToCart>
        );
    }

    const fullStyles = cn(
        baseStyles,
        'flex w-full transform-gpu items-center justify-center',
        'h-product-card-cta-height',
        'bg-(--product-card-cta-bg) text-(--product-card-cta-color)',
        'hover:bg-(--product-card-cta-bg-hover)',
        'active:scale-[0.98]',
        className,
    );

    if (line) {
        return (
            <QuantitySelector
                disabled={!cartReady}
                className={cn(fullStyles, 'bg-white text-(--product-card-cta-bg)')}
                i18n={i18n}
                value={quantity}
                update={update}
                allowDecreaseToZero={true}
            />
        );
    }

    return (
        <AddToCart
            className={fullStyles}
            quantity={1}
            data={{ product, selectedVariant: selected }}
            disabled={!cartReady}
            i18n={i18n}
        />
    );
};

ProductCardActions.displayName = 'Nordcom.ProductCard.Actions';
export default ProductCardActions;
