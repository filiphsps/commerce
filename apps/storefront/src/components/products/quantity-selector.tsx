'use client';

import { useCartStatus } from '@nordcom/cart-react';
import type { ChangeEvent, HTMLProps, KeyboardEventHandler } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/actionable/button';
import { Input } from '@/components/actionable/input';
import { useShop } from '@/components/shop/provider';
import { COMMERCE_DEFAULTS } from '@/utils/build-config';
import type { LocaleDictionary } from '@/utils/locale';
import { getTranslations } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';

/**
 * Sanitizes a raw input string into a valid non-negative integer string clamped to `maxQuantity`.
 *
 * @param value - Raw string from the quantity input element.
 * @param prev - Previous valid string used as fallback when `value` contains invalid characters.
 * @param maxQuantity - Upper bound for the sanitized quantity value.
 * @returns A sanitized non-negative integer string, or an empty string when `value` is blank.
 */
export const QuantityInputFilter = (
    value?: string,
    prev?: string,
    maxQuantity: number = COMMERCE_DEFAULTS.maxQuantity,
): string => {
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
    } else if (quantity > maxQuantity) {
        quantity = maxQuantity;
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
} & HTMLProps<HTMLFieldSetElement>;

/**
 * Stepper control for entering a purchase quantity, with decrease/increase buttons and a validated
 * text input. The decrease button disables at the lower bound (0 or 1, per `allowDecreaseToZero`) and
 * the increase button disables once the value reaches the shop's `maxQuantity`, so each control gives
 * a clear bound signal instead of silently no-opping. The three controls are grouped in a `<fieldset>`
 * under one accessible name so assistive tech announces them as a single quantity control.
 *
 * @param props.i18n - Locale dictionary for button and input accessible labels.
 * @param props.value - Controlled quantity value; defaults to 0.
 * @param props.update - Callback invoked with the validated new quantity on change.
 * @param props.disabled - When `true`, disables all interactive elements regardless of cart state.
 * @param props.allowDecreaseToZero - When `true`, permits decreasing the quantity to 0.
 * @param props.buttonClassName - Additional CSS class names applied to the decrease and increase buttons.
 * @param props.inputClassName - Additional CSS class names applied to the number input.
 * @returns The quantity stepper element.
 */
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
    const { shop } = useShop();
    const maxQuantity = shop.commerce?.maxQuantity ?? COMMERCE_DEFAULTS.maxQuantity;

    const [quantityValue, setQuantityValue] = useState(quantity.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync local quantityValue with the prop whenever the upstream value changes.
    // While the input is focused the user's in-progress edit is authoritative; the
    // effect re-syncs once focus leaves (the existing onBlur path finalizes the value).
    useEffect(() => {
        if (document.activeElement === inputRef.current) return;
        setQuantityValue(quantity.toString());
    }, [quantity]);

    const { cartReady, status } = useCartStatus();
    // Cart context can already be `ready` on the client when a streamed
    // Suspense boundary is hydrated, but the server rendered with the
    // provider's default unready state. Gate reactive context reads behind
    // a post-mount flag so the first client render matches server output.
    const [hydrated, setHydrated] = useState(false);
    useEffect(() => {
        setHydrated(true);
    }, []);
    const ready = hydrated && cartReady && status !== 'mutating';

    const updateQuantity = useCallback(
        (value: string | number) => {
            if ((typeof value === 'string' && value === '') || value === quantity) {
                return;
            }

            const parsedQuantity = safeParseFloat(null, QuantityInputFilter(value.toString(), undefined, maxQuantity));
            if (parsedQuantity === null) {
                // TODO: Should we show an error?
                return;
            }

            update(parsedQuantity);
        },
        [update, quantity, maxQuantity],
    );
    const decrease = useCallback(() => {
        if (allowDecreaseToZero ? quantity <= 0 : quantity <= 1) {
            return;
        }

        updateQuantity(quantity - 1);
    }, [quantity, allowDecreaseToZero, updateQuantity]);
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
    }, [quantityValue, allowDecreaseToZero, updateQuantity]);
    const onKeyDown = useCallback(
        ({ key }: Parameters<KeyboardEventHandler<HTMLInputElement>>[0]) => {
            if (key !== 'Enter') {
                return;
            }

            updateQuantity(quantityValue);
        },
        [quantityValue, updateQuantity],
    );

    const onChange = useCallback(
        ({ target: { value } }: ChangeEvent<HTMLInputElement>) => {
            const parsedValue = QuantityInputFilter(value, quantityValue, maxQuantity);

            setQuantityValue(parsedValue);
        },
        [quantityValue, maxQuantity],
    );

    const disabled = isDisabled || !ready;
    const decreaseDisabled = disabled || (allowDecreaseToZero ? quantity <= 0 : quantity <= 1);
    const increaseDisabled = disabled || quantity >= maxQuantity;

    return (
        // A `<fieldset>` groups the decrease/input/increase controls under one accessible name; the
        // `m-0 min-w-0` reset clears the UA fieldset margin and `min-inline-size: min-content` so it
        // still shrinks inside the flex cart-line layout.
        <fieldset
            {...props}
            aria-label={t('quantity')}
            className={cn(
                'm-0 flex h-12 min-h-fit w-full min-w-0 overflow-hidden rounded-lg border-(--surface-0) border-2 border-solid bg-(--surface-0) p-0 leading-none opacity-50 drop-shadow transition-colors *:appearance-none *:text-center *:text-lg *:leading-none *:transition-colors',
                !disabled && 'opacity-100 focus-within:border-(--border-strong) hover:border-primary',
                className,
            )}
        >
            <Button
                aria-disabled={decreaseDisabled}
                aria-label={t('decrease')}
                type="button"
                className={cn(
                    'aspect-3/4 h-full select-none appearance-none rounded-none bg-transparent p-2 font-bold text-current',
                    !disabled &&
                        'cursor-pointer hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary focus-visible:text-primary-foreground active:bg-primary active:text-primary-foreground motion-safe:transition-[color,background-color,transform] motion-safe:duration-(--product-card-motion-fast) motion-safe:active:scale-[0.97]',
                    buttonClassName,
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
                max={maxQuantity}
                step={1}
                pattern="[0-9]"
                className={cn(
                    'h-full w-full grow appearance-none border-none bg-transparent font-bold text-sm',
                    inputClassName,
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
                aria-disabled={increaseDisabled}
                aria-label={t('increase')}
                type="button"
                className={cn(
                    'aspect-3/4 h-full select-none appearance-none rounded-none bg-transparent p-2 font-bold text-current',
                    !increaseDisabled &&
                        'cursor-pointer hover:bg-primary hover:text-primary-foreground focus-visible:bg-primary focus-visible:text-primary-foreground active:bg-primary active:text-primary-foreground motion-safe:transition-[color,background-color,transform] motion-safe:duration-(--product-card-motion-fast) motion-safe:active:scale-[0.97]',
                    buttonClassName,
                )}
                disabled={increaseDisabled}
                onClick={increase}
                title={t('increase')}
                data-quantity-increase
                data-testid="quantity-increase"
                data-nosnippet={true}
                styled={false}
            >
                {'+'}
            </Button>
        </fieldset>
    );
};

QuantitySelector.displayName = 'Nordcom.Products.QuantitySelector';

export { QuantitySelector };
