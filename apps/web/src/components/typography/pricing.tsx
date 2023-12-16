'use client';

import styles from '@/components/typography/pricing.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import { Money } from '@shopify/hydrogen-react';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import { memo, type HTMLProps } from 'react';

type PricingProps = {
    price?: MoneyV2 | null;
    compareAtPrice?: MoneyV2 | null;
} & HTMLProps<HTMLDivElement>;
const Pricing = ({ price, compareAtPrice, className, ...props }: PricingProps) => {
    return (
        <div {...props} className={`${styles.container} ${className || ''}`}>
            {price ? (
                <Money
                    data={price}
                    as={'div'}
                    className={`${styles.price} ${styles.current} ${compareAtPrice ? styles.sale : ''}`}
                />
            ) : null}
            {compareAtPrice ? (
                <div className={styles.previous}>
                    <Money data={compareAtPrice} as={'s'} className={`${styles.price} ${styles.dash}`} />
                </div>
            ) : null}
        </div>
    );
};

export default memo(Pricing, deepEqual);
