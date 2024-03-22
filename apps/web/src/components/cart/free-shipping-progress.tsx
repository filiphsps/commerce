'use client';

import styles from '@/components/cart/free-shipping-progress.module.scss';

import { type LocaleDictionary, useTranslation } from '@/utils/locale';
import { useCart, useMoney } from '@shopify/hydrogen-react';

import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';

type FreeShippingProgressProps = {
    i18n: LocaleDictionary;
};
const FreeShippingProgress = ({ i18n, ...props }: FreeShippingProgressProps) => {
    const { cost, status, lines } = useCart();
    const { currency } = useShop();
    const { t } = useTranslation('cart', i18n);
    const ready = status === 'idle';

    // TODO: Handle other currencies properly.
    let threshold = 95;
    switch (cost?.totalAmount?.currencyCode?.toUpperCase()) {
        case 'GBP':
            threshold = 80;
            break;
        case 'EUR':
            threshold = 95;
            break;
        case 'SEK':
            threshold = 1050;
            break;
        case 'DKK':
            threshold = 685;
            break;
        case 'NOK':
            threshold = 1075;
            break;
        case 'CAD':
            threshold = 135;
            break;
        default:
        case 'USD':
            threshold = 95;
            break;
    }
    const freeShipping = Number.parseFloat(cost?.totalAmount?.amount!) > threshold;
    const amountLeft = threshold - (Number.parseFloat(cost?.totalAmount?.amount!) || 0) || 0;

    const parsedAmountLeft = useMoney({
        currencyCode: cost?.totalAmount?.currencyCode || currency,
        amount: amountLeft.toString()
    });

    if (!lines || lines.length < 1) return null;

    return (
        <section {...props} className={`${styles.container} ${freeShipping ? styles.success : ''}`}>
            {freeShipping ? (
                <Label className={styles.label} suppressHydrationWarning={true}>
                    {t('free-shipping-on-this-order')}
                </Label>
            ) : (
                <Label className={styles.label} suppressHydrationWarning={true}>
                    {t('away-from-free-shipping', ready ? parsedAmountLeft.localizedString : '...')}
                </Label>
            )}
            <div className={`${styles.progress} ${freeShipping ? styles.full : ''}`}>
                <div
                    className={styles.line}
                    style={{
                        width: `${
                            (freeShipping && 100) ||
                            ((Number.parseFloat(cost?.totalAmount?.amount!) || 0) / threshold) * 100
                        }%`
                    }}
                    suppressHydrationWarning={true}
                />
            </div>
        </section>
    );
};

FreeShippingProgress.skeleton = () => {
    return (
        <section className={styles.container}>
            <div className={styles.progress}>
                <div className={styles.line} />
            </div>
        </section>
    );
};

FreeShippingProgress.displayName = 'Nordcom.Cart.FreeShippingProgress';
export { FreeShippingProgress };
