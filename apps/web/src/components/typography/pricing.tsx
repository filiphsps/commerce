'use client';

import styles from '@/components/typography/pricing.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import type { As } from '@/utils/system';
import { Money } from '@shopify/hydrogen-react';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import { memo, type HTMLProps } from 'react';

type PricingProps = {
    as?: As;
    price?: MoneyV2 | null;
    compareAtPrice?: MoneyV2 | null;
} & HTMLProps<HTMLDivElement>;
const Pricing = ({ as: Tag = 'div', price, compareAtPrice, className, ...props }: PricingProps) => {
    return (
        <Tag {...props} className={`${styles.container} ${className || ''}`}>
            {price ? (
                <Money
                    data={price}
                    as={'div'}
                    className={`${styles.price} ${styles.current} ${compareAtPrice ? styles.sale : ''}`}
                    suppressHydrationWarning={true}
                />
            ) : null}
            {compareAtPrice ? (
                <div className={styles.previous}>
                    <Money
                        data={compareAtPrice}
                        as={'s'}
                        className={`${styles.price} ${styles.dash}`}
                        suppressHydrationWarning={true}
                    />
                </div>
            ) : null}
        </Tag>
    );
};

export default memo(Pricing, deepEqual);
