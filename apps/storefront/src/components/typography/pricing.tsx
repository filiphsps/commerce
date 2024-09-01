import { Suspense } from 'react';

import { cn } from '@/utils/tailwind';
import { Money } from '@shopify/hydrogen-react';

import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { ComponentProps, ElementType, HTMLProps } from 'react';

export type PricingProps = {
    price?: MoneyV2 | null;
    as?: ElementType;
} & Omit<ComponentProps<typeof Money> & HTMLProps<HTMLDivElement>, 'children' | 'data' | 'as'>;
export const Pricing = ({ price, as: Tag = 'div', className, ...props }: PricingProps) => {
    if (!price) {
        return null;
    }

    return (
        <Suspense fallback={<Tag data-skeleton>20</Tag>}>
            <Money
                as={Tag}
                {...props}
                data={price}
                className={cn('text-lg font-bold proportional-nums leading-none', className)}
            />
        </Suspense>
    );
};
