import { Suspense } from 'react';

import { cn } from '@/utils/tailwind';

import type { PriceProps } from '@/components/products/price';
import { Price } from '@/components/products/price';

import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { ElementType, HTMLProps } from 'react';

export type PricingProps = {
    price?: MoneyV2 | null;
    as?: ElementType;
} & Omit<PriceProps & HTMLProps<HTMLDivElement>, 'children' | 'data' | 'as'>;
export const Pricing = ({ price, as: Tag = 'div', className, ...props }: PricingProps) => {
    if (!price) {
        console.warn('No price supplied to Pricing component.');
        return null;
    }

    return (
        <Suspense fallback={<Tag data-skeleton>...</Tag>}>
            <Price
                as={Tag as any}
                {...props}
                data={price}
                className={cn('text-lg font-bold proportional-nums leading-none', className)}
            />
        </Suspense>
    );
};
Pricing.displayName = 'Nordcom.Typography.Pricing';
