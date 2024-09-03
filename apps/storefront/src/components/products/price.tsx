import { Money } from '@shopify/hydrogen-react';

import type { ComponentProps } from 'react';

type MoneyProps = ComponentProps<typeof Money>;

export type PriceProps = MoneyProps;

/**
 * Wrapper for {@link Money} that suppresses hydration warnings.
 * Will eventually also handle wholesale pricing and more.
 */
export function Price({ ...props }: PriceProps) {
    return <Money {...props} suppressHydrationWarning={true} />;
}
Price.displayName = 'Nordcom.Product.Price';
