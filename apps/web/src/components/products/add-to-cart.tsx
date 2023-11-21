'use client';

import { Button } from '@/components/actionable/button';
import styles from '@/components/products/add-to-cart.module.scss';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { useTranslation } from '@/utils/locale';
import { useCart, useProduct } from '@shopify/hydrogen-react';
import type { ReactNode } from 'react';
import { useState, type HTMLProps } from 'react';
import { TbShoppingBagCheck, TbShoppingBagPlus } from 'react-icons/tb';

export type AddToCartProps = {
    locale: Locale;
    i18n: LocaleDictionary;
    quantity: number;
    showIcon?: boolean;
} & HTMLProps<HTMLButtonElement>;

// eslint-disable-next-line unused-imports/no-unused-vars
export const AddToCart = ({ locale, i18n, className, quantity = 0, showIcon = false, type, ...props }: AddToCartProps) => {
    const { t } = useTranslation('common', i18n);

    const [animation, setAnimation] = useState<NodeJS.Timeout | undefined>();
    const { selectedVariant } = useProduct();
    const { status, linesAdd } = useCart();

    const ready = ['idle', 'uninitialized'].includes(status) || !selectedVariant;

    let label: ReactNode = t('add-to-cart');
    let icon: ReactNode = showIcon ? <TbShoppingBagPlus /> : null;
    if (animation) {
        // 1. Have we just successfully added to cart, if so, show a checkmark.
        label = t('added-to-cart');
        icon = <TbShoppingBagCheck />;
    } else if (selectedVariant && !selectedVariant.availableForSale) {
        // 2. If out of stock, show the relevant label.
        label = t('out-of-stock');
        icon = null;
    } else if (!ready) {
        // 3. Cart is not ready, tell the user.
        label = t('cart-not-ready');
        icon = null;
    } else if (!quantity || quantity < 1) {
        // 4. Quantity is either invalid or 0.
        // TODO: This should not be a disabled state.
        label = t('quantity-too-low');
        icon = null;
    }

    return (
        <Button
            {...props}
            className={`${styles['add-to-cart']} ${className || ''}`}
            disabled={!selectedVariant!.availableForSale || quantity < 1}
            as="button"
            type={type || ('button' as any)}
            data-success={(animation && 'true') || undefined}
            onClick={() => {
                clearTimeout(animation);
                setAnimation(
                    setTimeout(() => {
                        clearTimeout(animation);
                        setAnimation(() => undefined);
                    }, 3000)
                );

                linesAdd([
                    {
                        merchandiseId: selectedVariant!.id!,
                        quantity
                    }
                ]);
            }}
            title={`Add ${quantity} to your cart`} // TODO: i18n.
        >
            {icon} {label}
        </Button>
    );
};
