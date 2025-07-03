'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getTranslations } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';

import { Button } from '@/components/actionable/button';
import { Input } from '@/components/actionable/input';

import type { LocaleDictionary } from '@/utils/locale';
import type { ChangeEvent, HTMLProps, KeyboardEventHandler } from 'react';

const MAX_QUANTITY = 199_999; // TODO: Per-tenant configuration.

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
    } else if (quantity > MAX_QUANTITY) {
        quantity = MAX_QUANTITY;
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
    disabled: isDisabled = false,
    allowDecreaseToZero = false,
    buttonClassName = '',
    inputClassName = '',
    ...props
}: QuantitySelectorProps) => {
    const { t } = getTranslations('common', i18n);
    const [quantityValue, setQuantityValue] = useState(quantity.toString() || '1');

    const { cartReady, status } = useCart();
    const ready = cartReady && !['updating'].includes(status);

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
        [update, quantity]
    );
    const decrease = useCallback(() => {
        if (allowDecreaseToZero ? quantity <= 0 : quantity <= 1) {
            return;
        }

        updateQuantity(quantity - 1);
    }, [allowDecreaseToZero, quantity, updateQuantity]);
    const increase = useCallback(() => {
        updateQuantity(quantity + 1);
    }, [quantity, updateQuantity]);

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
    }, [allowDecreaseToZero, quantityValue, updateQuantity]);
    const onKeyDown = useCallback(
        ({ key }: Parameters<KeyboardEventHandler<HTMLInputElement>>[0]) => {
            if (key !== 'Enter') {
                return;
            }

            updateQuantity(quantityValue);
        },
        [quantityValue, updateQuantity]
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
    }, [quantity, quantityValue]);

    const disabled = isDisabled || !ready;
    const decreaseDisabled = disabled || (allowDecreaseToZero ? quantity <= 0 : quantity <= 1);

    return (
        <section
            {...props}
            className={cn(
                'flex min-h-fit w-full overflow-hidden rounded-lg border-2 border-solid border-white bg-white p-0 leading-none opacity-50 drop-shadow transition-colors *:appearance-none *:text-center *:text-lg *:leading-none *:transition-colors',
                !disabled && 'hover:border-primary focus-visible::border-gray-300 opacity-100',
                className
            )}
            suppressHydrationWarning={true}
        >
            <Button
                suppressHydrationWarning={true}
                aria-disabled={decreaseDisabled}
                aria-label={t('decrease').toString()}
                type="button"
                className={cn(
                    'aspect-[3/4] h-full select-none appearance-none rounded-none bg-transparent p-2 font-bold text-current',
                    !disabled &&
                        'hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary focus-visible:text-primary-foreground active:bg-primary active:text-primary-foreground cursor-pointer',
                    buttonClassName
                )}
                disabled={decreaseDisabled}
                onClick={decrease}
                title={t('decrease').toString()}
                data-quantity-decrease
                data-testid="quantity-decrease"
                data-nosnippet={true}
                styled={false}
            >
                &ndash;
            </Button>

            {/* FIXME: This @ts-expect-error shouldn't be here! */}
            {/* @ts-expect-error */}
            <Input
                suppressHydrationWarning={true}
                aria-disabled={disabled}
                aria-label={t('quantity').toString()}
                ref={inputRef}
                type="number"
                title={t('quantity').toString()}
                min={1}
                max={MAX_QUANTITY}
                step={1}
                pattern="[0-9]"
                className={cn(
                    'h-full w-full grow appearance-none border-none bg-transparent text-sm font-bold outline-none focus:outline-none focus:ring-0',
                    inputClassName
                )}
                disabled={disabled}
                value={quantityValue}
                placeholder={t('quantity').toString()}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                onChange={onChange}
                data-quantity-input
                data-testid="quantity-input"
                data-nosnippet={true}
            />

            <Button
                suppressHydrationWarning={true}
                aria-disabled={disabled}
                aria-label={t('increase').toString()}
                type="button"
                className={cn(
                    'aspect-[3/4] h-full select-none appearance-none rounded-none bg-transparent p-2 font-bold text-current',
                    !disabled &&
                        'hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary focus-visible:text-primary-foreground active:bg-primary active:text-primary-foreground cursor-pointer',
                    buttonClassName
                )}
                disabled={disabled}
                onClick={increase}
                title={t('increase').toString()}
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
