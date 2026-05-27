import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { ElementType, HTMLProps } from 'react';
import { Suspense } from 'react';
import type { PriceProps } from '@/components/products/price';
import { Price } from '@/components/products/price';
import { cn } from '@/utils/tailwind';

export type PricingProps = {
    price?: MoneyV2 | null;
    as?: ElementType;
} & Omit<PriceProps & HTMLProps<HTMLDivElement>, 'children' | 'data' | 'as'>;
/**
 * Formats and renders a Shopify `MoneyV2` price with Suspense fallback.
 *
 * @param props.price - The monetary value to format; returns `null` when absent.
 * @param props.as - Wrapper element type; defaults to `div`.
 * @param props.className - Additional class names forwarded to `Price`.
 * @returns A Suspense-wrapped `Price` element, or `null` when `price` is falsy.
 */
export const Pricing = ({ price, as: Tag = 'div', className, ...props }: PricingProps) => {
    if (!price) {
        return null;
    }

    return (
        <Suspense fallback={<Tag data-skeleton>...</Tag>}>
            <Price
                as={Tag}
                {...props}
                data={price}
                className={cn('font-bold text-lg proportional-nums leading-none', className)}
            />
        </Suspense>
    );
};
Pricing.displayName = 'Nordcom.Typography.Pricing';
