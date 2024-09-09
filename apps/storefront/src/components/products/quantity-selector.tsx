'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';

import { Button } from '@/components/actionable/button';
import { Input } from '@/components/actionable/input';

import type { LocaleDictionary } from '@/utils/locale';
import type { ChangeEvent, HTMLProps, KeyboardEventHandler } from 'react';

export const QuantityInputFilter = (value?: string, prev?: string): string => {
    // FRO-58: Only allow numbers
    if (value && (/^[^\d()]*$/.test(value) || value.includes('.'))) return prev ?? '';

    if (!value || value === '') {
        return '';
    }

    // Remove non-numeric characters.
    value = value.replaceAll(/[^\d]/g, '').replace(/^0+/, '');

    let quantity = safeParseFloat(0, value);
    if (quantity < 0) {
        quantity = 0;
    } else if (quantity > 999) {
        quantity = 999;
    }

    return quantity.toString(10).split('.')[0];
};

export type QuantitySelectorProps = {
    i18n: LocaleDictionary;
    update: (quantity: number) => void;
    value?: number;
    disabled?: boolean;
    allowDecreaseToZero?: boolean;
    buttonClassName?: string;
    inputClassName?: string;
} & HTMLProps<HTMLDivElement>;

const QuantitySelector = ({
    className,
    i18n,
    value: quantity = 0,
    update,
    disabled: isDisabled,
    allowDecreaseToZero = false,
    buttonClassName = '',
    inputClassName = '',
    ...props
}: QuantitySelectorProps) => {
    const { t } = useTranslation('common', i18n);
    const [quantityValue, setQuantityValue] = useState(quantity.toString() || '1');

    const { cartReady, status } = useCart();

    const inputRef = useRef<HTMLInputElement>(null);

    const updateQuantity = useCallback(
        (value: string | number) => {
            if ((typeof value === 'string' && value === '') || value === quantity) {
                return;
            }

            const parsedQuantity = safeParseFloat(null, QuantityInputFilter(value.toString()));
            if (parsedQuantity === null) {
                // TODO: Should we show an error?
                return;
            }

            update(parsedQuantity);
        },
        [update, quantity, quantityValue]
    );
    const decrease = useCallback(() => {
        if (allowDecreaseToZero ? quantity <= 0 : quantity <= 1) {
            return;
        }

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

        // Handle invalid values.
        if (!allowDecreaseToZero && safeParseFloat(0, quantityValue) <= 0) {
            setQuantityValue('1');
            return;
        }

        updateQuantity(quantityValue);
    }, [quantityValue]);
    const onKeyDown = useCallback(
        ({ key }: Parameters<KeyboardEventHandler<HTMLInputElement>>[0]) => {
            if (key !== 'Enter') {
                return;
            }

            updateQuantity(quantityValue);
        },
        [quantityValue]
    );

    const onChange = useCallback(
        ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
            const parsedValue = QuantityInputFilter(value, quantityValue);

            setQuantityValue(parsedValue);
        },
        [quantityValue]
    );

    useEffect(() => {
        if (quantity.toString() === quantityValue) {
            return;
        }

        setQuantityValue(quantity.toString());
    }, [quantity]);

    const disabled = isDisabled || (status !== 'idle' && status !== 'uninitialized') || !cartReady;
    const decreaseDisabled = disabled || (allowDecreaseToZero ? quantity <= 0 : quantity <= 1);

    return (
        <section
            {...props}
            className={cn(
                'flex max-h-fit w-full overflow-hidden rounded-lg border-2 border-solid border-white bg-white p-0 leading-none opacity-50 transition-colors *:appearance-none *:text-center *:text-lg *:leading-none *:transition-colors',
                !disabled && 'hover:border-primary opacity-100',
                className
            )}
        >
            <Button
                aria-disabled={decreaseDisabled}
                aria-label={t('decrease')}
                type="button"
                className={cn(
                    'aspect-[3/4] h-full select-none appearance-none rounded-none bg-transparent p-2 font-bold text-current',
                    !disabled && 'hover:bg-primary hover:text-primary-foreground cursor-pointer',
                    buttonClassName
                )}
                disabled={decreaseDisabled}
                onClick={decrease}
                title={t('decrease')}
                data-quantity-decrease
                data-testid="quantity-decrease"
                data-nosnippet={true}
                styled={false}
            >
                &ndash;
            </Button>

            <Input
                aria-disabled={disabled}
                aria-label={t('quantity')}
                ref={inputRef}
                type="number"
                title={t('quantity')}
                min={1}
                max={999}
                step={1}
                pattern="[0-9]"
                className={cn(
                    'w-full grow appearance-none border-none bg-transparent text-sm font-bold outline-none focus:outline-none focus:ring-0',
                    inputClassName
                )}
                disabled={disabled}
                value={quantityValue}
                placeholder={t('quantity')}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                onChange={onChange}
                data-quantity-input
                data-testid="quantity-input"
                data-nosnippet={true}
            />

            <Button
                aria-disabled={disabled}
                aria-label={t('increase')}
                type="button"
                className={cn(
                    'aspect-[3/4] h-full select-none appearance-none rounded-none bg-transparent p-2 font-bold text-current',
                    !disabled && 'hover:bg-primary hover:text-primary-foreground cursor-pointer',
                    buttonClassName
                )}
                disabled={disabled}
                onClick={increase}
                title={t('increase')}
                data-quantity-increase
                data-testid="quantity-increase"
                data-nosnippet={true}
                styled={false}
            >
                {'+'}
            </Button>
        </section>
    );
};

QuantitySelector.displayName = 'Nordcom.Products.QuantitySelector';
export { QuantitySelector };
