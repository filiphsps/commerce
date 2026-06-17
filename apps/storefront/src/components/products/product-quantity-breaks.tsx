'use client';

import { useCartStatus } from '@nordcom/cart-react';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { ComponentPropsWithoutRef, HTMLProps } from 'react';
import { transformQuantityBreaks } from '@/api/product';
import { Button } from '@/components/actionable/button';
import { COMMON_BADGE_STYLES } from '@/components/product-display/primitives/badge-styles';
import { useProductOptions } from '@/components/product-options/context';
import { Price } from '@/components/products/price';
import { useQuantity } from '@/components/products/quantity-provider';
import type { LocaleDictionary } from '@/utils/locale';
import { capitalize, getTranslations } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';

export type ProductQuantityBreaksItemProps = {
    i18n: LocaleDictionary;
    minQuantity: number;
    maxQuantity?: number;
    discount?: number;
    className?: string;
} & Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'children' | 'as'>;
/**
 * Selectable quantity-break tier button showing the minimum quantity, optional discount badge, and computed price.
 *
 * @param props.i18n - Locale dictionary for the savings badge label.
 * @param props.minQuantity - Minimum quantity that activates this tier; also set as the cart quantity on click.
 * @param props.maxQuantity - Maximum quantity for this tier; used to determine whether the tier is active.
 * @param props.discount - Percentage discount applied to the unit price for this tier.
 * @param props.className - Additional CSS class names.
 * @returns The tier button element, or `null` when no variant price is available.
 */
export function ProductQuantityBreaksItem({
    i18n,
    minQuantity = 1,
    maxQuantity,
    discount = 0,
    className = '',
    ...props
}: ProductQuantityBreaksItemProps) {
    const { t: tProduct } = getTranslations('product', i18n);

    const { quantity, setQuantity } = useQuantity();

    const { selectedVariant } = useProductOptions();
    if (!selectedVariant?.price) {
        return null;
    }

    const price: MoneyV2 = {
        currencyCode: selectedVariant.price.currencyCode!,
        amount: (safeParseFloat(0, selectedVariant.price.amount) * minQuantity).toString(),
    };
    const discountedPrice: MoneyV2 = discount
        ? {
              currencyCode: selectedVariant.price.currencyCode!,
              amount: (safeParseFloat(0, selectedVariant.price.amount) * (1 - discount / 100) * minQuantity).toString(),
          }
        : price;

    const pricing = (
        <>
            <Price
                className={cn('font-bold text-lg leading-none', discount && 'text-(--state-sale)')}
                data={discountedPrice}
            />
            {discount ? (
                // `<del>` marks the pre-discount tier price as superseded for assistive tech;
                // `no-underline` keeps the single visual strike from the inner `line-through`.
                <del className="no-underline">
                    <Price
                        className="font-semibold text-(--text-muted) text-sm leading-none line-through"
                        data={price}
                    />
                </del>
            ) : null}
        </>
    );

    const active = quantity >= minQuantity && (!maxQuantity || quantity <= maxQuantity);
    return (
        <Button
            {...props}
            type="button"
            aria-pressed={active}
            className={cn(
                'flex h-16 items-center justify-between gap-2 rounded-xl border-(--surface-0) border-2 border-solid bg-(--surface-0) px-3 py-3 text-lg leading-none shadow transition-colors focus-within:border-(--border-strong) hover:border-(--border-strong)',
                active && 'border-primary text-primary',
                className,
            )}
            onClick={() => setQuantity(minQuantity)}
            styled={false}
        >
            <div className="flex items-start gap-2">
                <div className="font-bold text-lg leading-none">{minQuantity}x</div>

                {discount ? (
                    <div className={cn(COMMON_BADGE_STYLES, 'h-5 bg-sale-stripes px-2 font-bold text-white')}>
                        {capitalize(tProduct('save-n-percent', discount))}
                    </div>
                ) : null}
            </div>
            <div className="flex flex-col items-end justify-between gap-1">{pricing}</div>
        </Button>
    );
}
ProductQuantityBreaksItem.displayName = 'Nordcom.Products.QuantityBreaks.Item';

export type ProductQuantityBreaksProps = {
    i18n: LocaleDictionary;
    disabled?: boolean;
} & Omit<HTMLProps<HTMLDivElement>, 'type' | 'children' | 'as'>;
/**
 * Renders all quantity-break tiers for the currently selected variant.
 *
 * @param props.i18n - Locale dictionary forwarded to each tier item.
 * @param props.disabled - When `true`, disables all tier buttons regardless of cart state.
 * @returns The tier list section, or `null` when no variant or no breaks are defined.
 */
export function ProductQuantityBreaks({
    i18n,
    disabled = false,
    className = '',
    ...props
}: ProductQuantityBreaksProps) {
    const { selectedVariant } = useProductOptions();
    const { cartReady, status } = useCartStatus();

    if (!selectedVariant) {
        return null;
    }

    const breaks = transformQuantityBreaks(selectedVariant.quantityBreaks) || [];
    if (breaks.length <= 0) {
        return null;
    }

    const ready = !disabled && selectedVariant.availableForSale && cartReady && status !== 'mutating';
    return (
        <section
            className={cn(
                'flex flex-col gap-(--block-spacer) empty:hidden',
                !ready && 'pointer-events-none opacity-50',
                className,
            )}
            {...props}
            suppressHydrationWarning={true}
        >
            <ProductQuantityBreaksItem
                i18n={i18n}
                minQuantity={1}
                maxQuantity={breaks.length > 0 ? breaks[0].minimumQuantity - 1 : undefined}
            />
            {breaks.map(({ minimumQuantity, value }, index) => (
                <ProductQuantityBreaksItem
                    key={`${minimumQuantity}-${value}`}
                    i18n={i18n}
                    minQuantity={minimumQuantity}
                    maxQuantity={breaks.length > index + 1 ? breaks[index + 1].minimumQuantity - 1 : undefined}
                    discount={value}
                />
            ))}
        </section>
    );
}
ProductQuantityBreaks.displayName = 'Nordcom.Products.QuantityBreaks';
