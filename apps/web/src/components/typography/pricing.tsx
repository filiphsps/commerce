'use client';

import styles from '@/components/typography/pricing.module.scss';
import { Money } from '@shopify/hydrogen-react';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import type { HTMLProps } from 'react';

type PricingProps = {
    price: MoneyV2;
    compareAtPrice?: MoneyV2;
} & HTMLProps<HTMLDivElement>;
const Pricing = ({ price, compareAtPrice, ...props }: PricingProps) => {
    return (
        <div {...props} className={styles.container}>
            <div className={styles.current}>
                <Money data={price} as={'span'} className={`${styles.price} ${(compareAtPrice && 'Sale') || ''}`} />
            </div>
            {compareAtPrice && (
                <div className={styles.previous}>
                    <s className={styles.dash}>
                        <Money data={compareAtPrice} as={'span'} className={styles.price} />
                    </s>
                </div>
            )}
        </div>
    );
};

export default Pricing;
