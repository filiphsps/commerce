'use client';

import styles from '@/components/typography/pricing.module.scss';
import { Money } from '@shopify/hydrogen-react';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps } from 'react';

type PricingProps = {
    price?: MoneyV2 | null;
    compareAtPrice?: MoneyV2 | null;
} & HTMLProps<HTMLDivElement>;
const Pricing = ({ price, compareAtPrice, className, ...props }: PricingProps) => {
    return (
        <div {...props} className={`${styles.container} ${className || ''}`}>
            {price ? (
                <div className={styles.current}>
                    <Money
                        data={price}
                        as={'span'}
                        className={`${styles.price} ${compareAtPrice ? styles.sale : ''}`}
                    />
                </div>
            ) : null}
            {compareAtPrice ? (
                <div className={styles.previous}>
                    <s className={styles.dash}>
                        <Money data={compareAtPrice} as={'span'} className={styles.price} />
                    </s>
                </div>
            ) : null}
        </div>
    );
};

export default Pricing;
