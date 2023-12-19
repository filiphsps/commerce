import styles from '@/components/typography/pricing.module.scss';
import { deepEqual } from '@/utils/deep-equal';
import { Money } from '@shopify/hydrogen-react';
import type { MoneyV2 } from '@shopify/hydrogen-react/storefront-api-types';
import { memo } from 'react';

export type PricingProps = {
    price?: MoneyV2 | null;
    compareAtPrice?: MoneyV2 | null;
};
const Pricing = ({ price, compareAtPrice }: PricingProps) => {
    return (
        <>
            {price ? (
                <Money
                    as={'div'}
                    data={price}
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
        </>
    );
};

export default memo(Pricing, deepEqual);
