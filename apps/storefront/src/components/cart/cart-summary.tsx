import styles from '@/components/cart/cart-summary.module.scss';

import { Suspense, useEffect, useState } from 'react';
import { FiChevronRight, FiLock } from 'react-icons/fi';

import type { Shop } from '@nordcom/commerce-database';

import { type LocaleDictionary, useTranslation } from '@/utils/locale';
import { Pluralize } from '@/utils/pluralize';
import { Money, ShopPayButton, useCart } from '@shopify/hydrogen-react';

import { Button } from '@/components/actionable/button';
import { CartCoupons } from '@/components/cart/cart-coupons';
import { CartNote } from '@/components/cart/cart-note';
import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';

import { AcceptedPaymentMethods } from '../informational/accepted-payment-methods';

import type { StoreModel } from '@/models/StoreModel';

// TODO: Configurable free shipping.

type CartSummaryProps = {
    shop: Shop;
    onCheckout: any;
    i18n: LocaleDictionary;

    /** @deprecated */
    store: StoreModel;
};
const CartSummary = ({ shop, onCheckout, i18n, store }: CartSummaryProps) => {
    const { t } = useTranslation('cart', i18n);
    const { totalQuantity, lines, cost, note, discountCodes, cartReady } = useCart();
    const { currency } = useShop();
    const [showNote, setShowNote] = useState(false);

    useEffect(() => {
        if (!note || showNote) return;

        setShowNote(showNote);
    }, [note]);

    const sale = lines
        ? lines.reduce(
              (sum, line) =>
                  (line?.cost?.compareAtAmountPerQuantity &&
                      sum +
                          ((Number.parseFloat(line.cost.compareAtAmountPerQuantity.amount!) || 0) *
                              (line.quantity || 0) -
                              Number.parseFloat(line.cost.totalAmount?.amount!))) ||
                  sum,
              0
          ) || 0
        : 0;
    const totalSale = lines
        ? sale +
          (
              lines.map((line) => {
                  return (
                      line?.discountAllocations?.reduce(
                          (sum, line) =>
                              (line?.discountedAmount?.amount &&
                                  sum + Number.parseFloat(line.discountedAmount.amount!)) ||
                              sum,
                          0
                      ) || 0
                  );
              }) || []
          ).reduce((sum, line) => sum + line || sum, 0)
        : 0;
    const salePercentage = Math.round(((100 * sale) / Number.parseFloat(cost?.totalAmount?.amount || '0')) * 100) / 100;

    const promos =
        Number.parseFloat(cost?.subtotalAmount?.amount!) - Number.parseFloat(cost?.totalAmount?.amount!) || 0;

    return (
        <div className={styles.container}>
            {(totalQuantity || 0) > 0 ? (
                <section className={styles.section}>
                    <header className={styles.header}>
                        <Label>{t('label-cart-note')}</Label>
                    </header>

                    <CartNote i18n={i18n} />
                </section>
            ) : null}

            <section className={styles.section}>
                <header className={styles.header}>
                    <Label>{t('order-summary')}</Label>
                    <div>
                        {totalQuantity} {Pluralize({ count: totalQuantity || 0, noun: 'item' })}
                    </div>
                </header>

                <div className={styles.lines}>
                    <div className={`${styles['line-item']} ${styles.breakdown}`}>
                        <Label className={styles.label}>{t('shipping')}</Label>
                        <div className={styles.money}>{'TBD*'}</div>
                    </div>

                    <div className={`${styles['line-item']} ${styles.breakdown}`}>
                        <Label className={styles.label}>{t('subtotal')}</Label>
                        {cost?.subtotalAmount ? (
                            <Money
                                className={styles.money}
                                data={{
                                    currencyCode: cost.subtotalAmount.currencyCode,
                                    amount:
                                        (totalSale &&
                                            (Number.parseFloat(cost.subtotalAmount.amount!) + totalSale).toString()) ||
                                        cost.subtotalAmount.amount
                                }}
                            />
                        ) : null}
                    </div>

                    {totalSale ? (
                        <>
                            {sale ? (
                                <div
                                    className={`${styles['line-item']} ${styles.breakdown} ${styles.discounted}`}
                                    title={`${salePercentage}% OFF`}
                                >
                                    <Label className={styles.label}>{t('discount')}</Label>
                                    {cartReady ? (
                                        <Money
                                            className={styles.money}
                                            data={{
                                                currencyCode: cost?.totalAmount?.currencyCode,
                                                amount: sale.toString()
                                            }}
                                        />
                                    ) : null}
                                </div>
                            ) : null}

                            {lines?.map((line, index) => {
                                if (!line) return null;

                                return line.discountAllocations?.map((discount) => {
                                    if (!discount?.discountedAmount) return null;

                                    return (
                                        <div
                                            className={`${styles['line-item']} ${styles.breakdown} ${styles.discounted}`}
                                            key={`${line.id}-${discount.discountedAmount.amount}`}
                                        >
                                            <div className={styles.label}>
                                                {index <= 0 ? t('automatic-discount') : null}
                                            </div>
                                            <Money
                                                className={styles.money}
                                                data={{
                                                    currencyCode: cost?.totalAmount?.currencyCode,
                                                    amount: discount.discountedAmount.amount
                                                }}
                                            />
                                        </div>
                                    );
                                });
                            })}
                        </>
                    ) : null}

                    {promos ? (
                        <div className={`${styles['line-item']} ${styles.breakdown} ${styles.discounted}`}>
                            <Label className={styles.label}>{t('promo-codes')}</Label>
                            {cartReady ? (
                                <Money
                                    className={styles.money}
                                    data={{
                                        currencyCode: cost?.totalAmount?.currencyCode,
                                        amount: promos.toString().replace('-', '')
                                    }}
                                />
                            ) : null}
                        </div>
                    ) : null}

                    <div className={`${styles['line-item']} ${styles.breakdown} ${styles.totals}`}>
                        <Label className={styles.label}>{t('estimated-total')}</Label>
                        {cost?.totalAmount ? (
                            <Money
                                className={styles.money}
                                data={
                                    cost.totalAmountEstimated ??
                                    (cost.totalAmount as any) ?? {
                                        currencyCode: currency,
                                        amount: 0
                                    }
                                }
                            />
                        ) : null}
                    </div>

                    <div className={styles.notice}>{`*${t('shipping-calculated-at-checkout')}`}</div>
                </div>
            </section>

            {discountCodes && discountCodes.length > 0 ? (
                <section className={styles.section}>
                    <Suspense key={`${shop.id}.cart.coupons`}>
                        <CartCoupons />
                    </Suspense>
                </section>
            ) : null}

            <section className={`${styles.section} ${styles['section-actions']}`}>
                <Button
                    className={`${styles.button} ${styles['checkout-button']}`}
                    disabled={!cartReady || (totalQuantity || 0) <= 0 || !lines}
                    onClick={onCheckout}
                >
                    <Label>{t('continue-to-checkout')}</Label>
                    <FiChevronRight className={styles.icon} />
                </Button>

                {lines && lines.length > 0 ? (
                    <>
                        {cartReady ? (
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
                        ) : (
                            <Button className={`${styles.button} ${styles['shop-button']}`} disabled={true} />
                        )}
                    </>
                ) : null}
            </section>

            <section className={`${styles.section} ${styles['section-security']}`}>
                <AcceptedPaymentMethods store={store} className={styles['payment-methods']} />

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
