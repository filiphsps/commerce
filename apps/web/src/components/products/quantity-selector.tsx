'use client';

import styles from '@/components/products/quantity-selector.module.scss';
import type { LocaleDictionary } from '@/utils/locale';
import { useTranslation } from '@/utils/locale';
import { useCallback, useEffect, useState, type HTMLProps } from 'react';

export const QuantityInputFilter = (value?: string, prev?: string): string => {
    // FRO-58: Only allow numbers
    if (value && (/^[^\d()]*$/.test(value) || value.includes('.'))) return prev ?? '';

    if (!value || value === '') {
        return '';
    }

    let quantity = Number.parseInt(value) || 0;
    if (quantity < 0) {
        quantity = 0;
    } else if (quantity > 999) {
        quantity = 999;
    }

    return quantity.toString(10);
};

export type QuantitySelectorProps = {
    i18n: LocaleDictionary;
    update: (quantity: number) => void;
    value?: number;
} & HTMLProps<HTMLDivElement>;

const QuantitySelector = ({ className, i18n, value: quantity = 0, update, ...props }: QuantitySelectorProps) => {
    const { t } = useTranslation('common', i18n);
    const [quantityValue, setQuantityValue] = useState('1');

    const updateQuantity = useCallback(
        (value: string | number) => {
            if (typeof value === 'string' && value === '') return;
            else if (value === quantity) return;
            update(typeof value === 'string' ? Number.parseInt(value) : value);
        },
        [update, quantity]
    );

    useEffect(() => {
        if (quantity.toString() === quantityValue) return;
        setQuantityValue(quantity.toString());
    }, [quantity]);

    return (
        <section {...props} className={`${styles.container} ${className || ''}`}>
            <button
                type="button"
                className={`${styles.button} ${styles.add}`}
                disabled={quantity <= 1}
                onClick={() => quantity > 1 && updateQuantity(quantity - 1)}
                title="Decrease quantity" // TODO: i18n.
                data-quantity-decrease
            >
                -
            </button>
            <input
                type="number"
                min={1}
                max={999}
                step={1}
                pattern="[0-9]"
                className={styles.input}
                value={quantityValue}
                placeholder={t('quantity')}
                onBlur={(_) => {
                    if (!quantityValue) updateQuantity('1');
                    updateQuantity(quantityValue);
                }}
                onKeyDown={({ key, preventDefault }) => {
                    if (key === 'Enter') {
                        updateQuantity(quantityValue);
                        return;
                    } else if (['.', ',', '-', '+'].includes(key)) {
                        preventDefault();
                        return;
                    }
                }}
                onChange={(e) => {
                    const value = QuantityInputFilter(e?.target?.value, quantityValue);
                    if (value == quantityValue) return;

                    setQuantityValue(value);
                }}
                data-quantity-input
                suppressHydrationWarning
            />
            <button
                type="button"
                className={`${styles.button} ${styles.remove}`}
                onClick={() => updateQuantity(quantity + 1)}
                title="Increase quantity" // TODO: i18n.
                data-quantity-increase
            >
                +
            </button>
        </section>
    );
};

QuantitySelector.displayName = 'Nordcom.QuantitySelector';
export { QuantitySelector };
