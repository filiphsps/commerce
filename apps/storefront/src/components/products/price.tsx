import { Money } from '@shopify/hydrogen-react';

import type { ComponentProps } from 'react';
import { cn } from '@/utils/tailwind';

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

/**
 * Compare-at ("was") price for a discounted line. Renders the amount inside a `<del>` so assistive
 * tech announces it as the superseded price (a CSS strike alone is invisible to it); the visual strike
 * comes from the `line-through` this adds, and the `<del>`'s own underline is suppressed so the strike
 * never doubles. Use this everywhere a struck-through original price appears so the semantic stays
 * consistent.
 *
 * @param props.className - Additional class names merged after the `line-through` strike.
 * @returns The struck-through, semantically-superseded price element.
 */
export function CompareAtPrice({ className, ...props }: PriceProps) {
    return (
        <del className="no-underline">
            <Price className={cn('line-through', className)} {...props} />
        </del>
    );
}
CompareAtPrice.displayName = 'Nordcom.Product.CompareAtPrice';
