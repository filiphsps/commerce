'use client';

import { transformQuantityBreaks } from '@/api/product';
import { capitalize, getTranslations } from '@/utils/locale';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { useCart, useProduct } from '@shopify/hydrogen-react';

import { Button } from '@/components/actionable/button';
import { COMMON_BADGE_STYLES } from '@/components/product-card/product-card-badges';
import { Price } from '@/components/products/price';
import { useQuantity } from '@/components/products/quantity-provider';

import type { ProductVariant } from '@/api/product';
import type { LocaleDictionary } from '@/utils/locale';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps } from 'react';

export type ProductQuantityBreaksItemProps = {
    i18n: LocaleDictionary;
    minQuantity: number;
    maxQuantity?: number;
    discount?: number;
    className?: string;
} & Omit<HTMLProps<HTMLButtonElement>, 'type' | 'children' | 'as'>;
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

    const { selectedVariant } = useProduct();
    if (!selectedVariant || !selectedVariant.price) {
        return null;
    }

    const price: MoneyV2 = {
        currencyCode: selectedVariant.price.currencyCode!,
        amount: (safeParseFloat(0, selectedVariant.price.amount) * minQuantity).toString()
    };
    const discountedPrice: MoneyV2 = discount
        ? {
              currencyCode: selectedVariant.price.currencyCode!,
              amount: (safeParseFloat(0, selectedVariant.price.amount) * (1 - discount / 100) * minQuantity).toString()
          }
        : price;

    const pricing = (
        <>
            <Price
                className={cn('text-lg font-bold leading-none', discount && 'text-red-500')}
                data={discountedPrice}
            />
            {discount ? (
                <Price className="text-sm font-semibold leading-none text-gray-400 line-through" data={price} />
            ) : null}
        </>
    );

    const active = quantity >= minQuantity && (!maxQuantity || quantity <= maxQuantity);
    return (
        <Button
            {...props}
            type="button"
            className={cn(
                'flex h-16 items-center justify-between gap-2 rounded-xl border-2 border-solid border-white bg-white px-3 py-3 text-lg leading-none shadow transition-colors focus-within:border-gray-400 hover:border-gray-400',
                active && 'border-primary text-primary',
                className
            )}
            onClick={() => setQuantity(minQuantity)}
            styled={false}
        >
            <div className="flex items-start gap-2">
                <div className="text-lg font-bold leading-none">{minQuantity}x</div>

                {discount ? (
                    <div className={cn(COMMON_BADGE_STYLES, 'bg-sale-stripes h-5 px-2 font-bold text-white')}>
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
export function ProductQuantityBreaks({
    i18n,
    disabled = false,
    className = '',
    ...props
}: ProductQuantityBreaksProps) {
    const { selectedVariant } = useProduct() as ReturnType<typeof useProduct> & { selectedVariant: ProductVariant };
    const { cartReady, status } = useCart();

    const breaks = transformQuantityBreaks(selectedVariant.quantityBreaks) || [];
    if (breaks.length <= 0) {
        return null;
    }

    const ready = !disabled && selectedVariant.availableForSale && cartReady && !['updating'].includes(status);
    return (
        <section
            className={cn('flex flex-col gap-2 empty:hidden', !ready && 'pointer-events-none opacity-50', className)}
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
