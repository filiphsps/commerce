import styles from '@/components/cart/cart-coupons.module.scss';
import { Label } from '@/components/typography/label';
import { useCart } from '@shopify/hydrogen-react';
import type { CartDiscountCode } from '@shopify/hydrogen-react/storefront-api-types';
import { FiTag, FiX } from 'react-icons/fi';

const CartCoupons = ({}) => {
    'use client';

    const { discountCodes, discountCodesUpdate, status } = useCart();

    if ((status !== 'idle' && status !== 'updating') || !discountCodes?.length) return null;

    return (
        <div className={styles.container}>
            <Label>Applied Promo</Label>
            <div className={styles.coupons}>
                {(discountCodes as CartDiscountCode[])?.map(
                    ({ code }) =>
                        (code && (
                            <div key={code} className={styles.code}>
                                <div className={styles.tag}>
                                    <FiTag className={styles.icon} />
                                </div>

                                <Label className={styles.label} as="label">
                                    {code}
                                </Label>

                                <button
                                    className={styles.action}
                                    type="button"
                                    title={`Remove promo code "${code}"`}
                                    onClick={() =>
                                        discountCodesUpdate(
                                            (discountCodes.filter((i) => i?.code !== code) as any) || []
                                        )
                                    }
                                >
                                    <FiX className={styles.icon} />
                                </button>
                            </div>
                        )) ||
                        null
                )}
            </div>
        </div>
    );
};

CartCoupons.displayName = 'Nordcom.Cart.Coupons';
export { CartCoupons };
