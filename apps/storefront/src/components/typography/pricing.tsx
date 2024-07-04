import styles from '@/components/typography/pricing.module.scss';

import { Fragment } from 'react/jsx-runtime';

import { cn } from '@/utils/tailwind';
import { Money } from '@shopify/hydrogen-react';

import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';

export type PricingProps = {
    price?: MoneyV2 | null;
    compareAtPrice?: MoneyV2 | null;

    wrapperFallback?: boolean;
};
const Pricing = ({ price, compareAtPrice, wrapperFallback = false }: PricingProps) => {
    const As = compareAtPrice && wrapperFallback ? 'div' : Fragment;

    return (
        <As>
            {price ? (
                <Money
                    data={price}
                    data-sale={compareAtPrice ? true : undefined}
                    data-pricing
                    as={'div'}
                    className={cn(styles.price, styles.current, compareAtPrice && 'font-extrabold text-red-500')}
                    suppressHydrationWarning={true}
                />
            ) : null}
            {compareAtPrice ? (
                <Money
                    data={compareAtPrice}
                    data-previous-pricing
                    as={'s'}
                    className={`${styles.price} ${styles.previous} ${styles.dash}`}
                    suppressHydrationWarning={true}
                />
            ) : null}
        </As>
    );
};

export default Pricing;
