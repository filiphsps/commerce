'use client';

import styles from '@/components/products/quantity-selector.module.scss';

import { type HTMLProps, useCallback, useEffect, useState } from 'react';
import { CgMathMinus, CgMathPlus } from 'react-icons/cg';

import { useTranslation } from '@/utils/locale';

import type { LocaleDictionary } from '@/utils/locale';
import type { ChangeEvent, KeyboardEventHandler } from 'react';

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
    disabled?: boolean;
    allowDecreaseToZero?: boolean;
} & HTMLProps<HTMLDivElement>;

const QuantitySelector = ({
    className,
    i18n,
    value: quantity = 0,
    update,
    disabled,
    allowDecreaseToZero,
    ...props
}: QuantitySelectorProps) => {
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

    const decrease = useCallback(() => {
        if (allowDecreaseToZero ? quantity <= 0 : quantity <= 1) return;

        updateQuantity(quantity - 1);
    }, [quantity]);
    const increase = useCallback(() => {
        updateQuantity(quantity + 1);
    }, [quantity]);

    const onBlur = useCallback(() => {
        if (!quantityValue) {
            updateQuantity(allowDecreaseToZero ? '0' : '1');
            return;
        }

        updateQuantity(quantityValue);
    }, [quantityValue]);
    const onKeyDown = useCallback(
        ({ key, preventDefault }: Parameters<KeyboardEventHandler<HTMLInputElement>>[0]) => {
            if (key === 'Enter') {
                updateQuantity(quantityValue);
                return;
            } else if (['.', ',', '-', '+'].includes(key)) {
                preventDefault();
                return;
            }
        },
        [quantityValue]
    );
    const onChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const value = QuantityInputFilter(e.target.value, quantityValue);
            if (value == quantityValue) return;

            setQuantityValue(value);
        },
        [quantityValue]
    );

    useEffect(() => {
        if (quantity.toString() === quantityValue) return;
        setQuantityValue(quantity.toString());
    }, [quantity]);

    return (
        <section {...props} className={`${styles.container} ${className || ''}`}>
            <button
                type="button"
                className={styles.button}
                disabled={disabled || (allowDecreaseToZero ? quantity <= 0 : quantity <= 1)}
                onClick={decrease}
                title="Decrease quantity" // TODO: i18n.
                data-quantity-decrease
            >
                <CgMathMinus />
            </button>
            <input
                type="number"
                min={1}
                max={999}
                step={1}
                pattern="[0-9]"
                className={styles.input}
                disabled={disabled}
                value={quantityValue}
                placeholder={t('quantity')}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                onChange={onChange}
                suppressHydrationWarning={true}
                data-quantity-input
            />
            <button
                type="button"
                className={styles.button}
                disabled={disabled}
                onClick={increase}
                title="Increase quantity" // TODO: i18n.
                data-quantity-increase
            >
                <CgMathPlus />
            </button>
        </section>
    );
};

QuantitySelector.displayName = 'Nordcom.Products.QuantitySelector';
export { QuantitySelector };