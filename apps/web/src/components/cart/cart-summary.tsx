import { Button } from '@/components/actionable/button';
import { CartCoupons } from '@/components/cart/cart-coupons';
import { CartNote } from '@/components/cart/cart-note';
import styles from '@/components/cart/cart-summary.module.scss';
import Link from '@/components/link';
import { Label } from '@/components/typography/label';
import type { StoreModel } from '@/models/StoreModel';
import { useTranslation, type LocaleDictionary } from '@/utils/locale';
import { Pluralize } from '@/utils/pluralize';
import { Money, ShopPayButton, useCart } from '@shopify/hydrogen-react';
import { Suspense, useEffect, useState } from 'react';
import { FiChevronRight, FiLock } from 'react-icons/fi';
import { AcceptedPaymentMethods } from '../informational/accepted-payment-methods';

type CartSummaryProps = {
    onCheckout: any;
    i18n: LocaleDictionary;

    /** @deprecated */
    store: StoreModel;
};
const CartSummary = ({ onCheckout, i18n, store }: CartSummaryProps) => {
    const { t } = useTranslation('cart', i18n);
    const { totalQuantity, status, lines, cost, note } = useCart();
    const [showNote, setShowNote] = useState(false);
    const loading = status !== 'idle';

    useEffect(() => {
        if (!note || showNote) return;

        setShowNote(showNote);
    }, [note]);

    const sale =
        lines?.reduce(
            (sum, line) =>
                (line?.cost?.compareAtAmountPerQuantity &&
                    sum +
                        ((Number.parseFloat(line?.cost?.compareAtAmountPerQuantity?.amount!) || 0) *
                            (line?.quantity || 0) -
                            Number.parseFloat(line.cost.totalAmount?.amount!))) ||
                sum,
            0
        ) || 0;
    const salePercentage = Math.round(((100 * sale) / Number.parseFloat(cost?.totalAmount?.amount || '0')) * 100) / 100;

    const promos =
        Number.parseFloat(cost?.subtotalAmount?.amount!) - Number.parseFloat(cost?.totalAmount?.amount!) || 0;

    // TODO: Configurable.
    // TODO: Utility function.
    const freeShipping = Number.parseFloat(cost?.totalAmount?.amount!) >= 95;

    return (
        <div className={styles.container}>
            <section className={styles.section}>
                <header className={styles.header}>
                    <Label>{t('label-cart-note')}</Label>
                </header>

                <Suspense>
                    <CartNote i18n={i18n} />
                </Suspense>
            </section>

            <section className={styles.section}>
                <header className={styles.header}>
                    <Label>{t('order-summary')}</Label>
                    <div>
                        {totalQuantity} {Pluralize({ count: totalQuantity || 0, noun: 'item' })}
                    </div>
                </header>

                <div className={styles.lines}>
                    <div
                        className={`${styles['line-item']} ${styles.breakdown} ${
                            freeShipping ? `${styles.discount} ${styles.shipping}` : ''
                        }`}
                    >
                        <Label className={styles.label}>{t('shipping')}</Label>

                        {freeShipping ? (
                            <Money
                                className={styles.money}
                                data={{
                                    currencyCode: cost?.subtotalAmount?.currencyCode,
                                    amount: (0).toString()
                                }}
                            />
                        ) : (
                            <div className={styles.money}>{'TBD*'}</div>
                        )}
                    </div>

                    <div className={`${styles['line-item']} ${styles.breakdown}`}>
                        <Label className={styles.label}>{t('subtotal')}</Label>
                        {cost?.subtotalAmount ? (
                            <Money
                                className={styles.money}
                                data={{
                                    currencyCode: cost?.subtotalAmount?.currencyCode,
                                    amount:
                                        (sale &&
                                            (Number.parseFloat(cost?.subtotalAmount?.amount!) + sale).toString()) ||
                                        cost?.subtotalAmount?.amount
                                }}
                            />
                        ) : null}
                    </div>

                    {sale ? (
                        <div
                            className={`${styles['line-item']} ${styles.breakdown} ${styles.discounted}`}
                            title={`${salePercentage}% OFF`}
                        >
                            <Label className={styles.label}>{t('sale-discount')}</Label>
                            <Money
                                className={styles.money}
                                data={{
                                    currencyCode: cost?.totalAmount?.currencyCode,
                                    amount: sale.toString()
                                }}
                            />
                        </div>
                    ) : null}

                    {promos ? (
                        <div className={`${styles['line-item']} ${styles.breakdown} ${styles.discounted}`}>
                            <Label className={styles.label}>{t('promo-codes')}</Label>
                            <Money
                                className={styles.money}
                                data={{
                                    currencyCode: cost?.totalAmount?.currencyCode,
                                    amount: promos.toString()
                                }}
                            />
                        </div>
                    ) : null}

                    <div className={`${styles['line-item']} ${styles.breakdown} ${styles.totals}`}>
                        <Label className={styles.label}>{t('estimated-total')}</Label>
                        {cost?.totalAmount ? (
                            <Money
                                className={styles.money}
                                data={(cost?.totalAmountEstimated || cost?.totalAmount) as any}
                            />
                        ) : null}
                    </div>

                    {!freeShipping ? (
                        <div className={styles.notice}>{`*${t('shipping-calculated-at-checkout')}`}</div>
                    ) : null}
                </div>
            </section>

            <section className={styles.section}>
                <Suspense>
                    <CartCoupons />
                </Suspense>
            </section>

            <section className={`${styles.section} ${styles['section-actions']}`}>
                <Button
                    className={`${styles.button} ${styles['checkout-button']}`}
                    disabled={loading || (totalQuantity || 0) <= 0 || !lines}
                    onClick={onCheckout}
                >
                    <Label>{t('continue-to-checkout')}</Label>
                    <FiChevronRight className={styles.icon} />
                </Button>

                {!loading && lines && lines.length > 0 ? (
                    <Suspense>
                        <ShopPayButton
                            // TODO: Only show this if we're using Shopify.
                            width="100%"
                            className={`${styles.button} ${styles['shop-button']}`}
                            variantIdsAndQuantities={lines.map(({ quantity, merchandise: { id } }: any) => ({
                                quantity,
                                id
                            }))}
                            channel="hydrogen"
                        />
                    </Suspense>
                ) : null}
            </section>

            <section className={`${styles.section} ${styles['section-security']}`}>
                <Suspense>
                    <AcceptedPaymentMethods store={store} className={styles['payment-methods']} />
                </Suspense>

                <div className={styles.notice}>
                    <FiLock className={styles.icon} />
                    Safely complete your purchase through Nordcom Group Inc.&apos;s trusted partner&apos;s
                    <Link href="https://www.shopify.com/security/pci-compliant" rel="nofollow" target="_blank">
                        {' '}
                        PCI DSS compliant{' '}
                    </Link>
                    checkout powered by Stripe and/or Shopify.
                </div>
            </section>
        </div>
    );
};

CartSummary.displayName = 'Nordcom.Cart.Summary';
export { CartSummary };
