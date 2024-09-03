import styles from '@/components/cart/cart-summary.module.scss';

import { useEffect, useState } from 'react';
import { FiChevronRight, FiLock } from 'react-icons/fi';

import type { OnlineShop } from '@nordcom/commerce-db';

import { type LocaleDictionary, useTranslation } from '@/utils/locale';
import { pluralize } from '@/utils/pluralize';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { Money, ShopPayButton, useCart } from '@shopify/hydrogen-react';

import { Button } from '@/components/actionable/button';
import { CartCoupons } from '@/components/cart/cart-coupons';
import { CartNote } from '@/components/cart/cart-note';
import Link from '@/components/link';
import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';

import type { ReactNode } from 'react';

const SUMMARY_LABEL_STYLES = 'font-medium text-sm capitalize text-gray-600';

// TODO: Configurable free shipping.

type CartSummaryProps = {
    shop: OnlineShop;
    onCheckout: any;
    i18n: LocaleDictionary;

    children?: ReactNode;
    paymentMethods?: ReactNode;
};
const CartSummary = ({ onCheckout, i18n, children, paymentMethods }: CartSummaryProps) => {
    const { t } = useTranslation('cart', i18n);
    const { totalQuantity, lines = [], cost, note, discountCodes = [], cartReady } = useCart();
    const { currency } = useShop();
    const [showNote, setShowNote] = useState(false);

    useEffect(() => {
        if (!note || showNote) return;

        setShowNote(showNote);
    }, [note]);
    const sale =
        lines.reduce(
            (sum, line) =>
                (line!.cost!.compareAtAmountPerQuantity &&
                    sum +
                        (safeParseFloat(0, line?.cost?.compareAtAmountPerQuantity?.amount) * (line!.quantity || 0) -
                            safeParseFloat(0, line?.cost?.totalAmount?.amount))) ||
                sum,
            0
        ) || 0;
    const totalSale =
        sale +
        lines
            .map((line) => {
                if (line!.discountAllocations!.length <= 0) {
                    return 0;
                }

                return line!.discountAllocations!.reduce(
                    (sum, line) =>
                        (line!.discountedAmount!.amount && sum + safeParseFloat(0, line?.discountedAmount?.amount)) ||
                        sum,
                    0
                );
            })
            .reduce((sum, line) => sum + line || sum, 0);

    const salePercentage = Math.round(((100 * sale) / safeParseFloat(0, cost?.totalAmount?.amount)) * 100) / 100;
    const promos = safeParseFloat(0, cost?.subtotalAmount?.amount) - safeParseFloat(0, cost?.totalAmount?.amount) || 0;

    if (cartReady && (totalQuantity || 0) <= 0) {
        return null;
    }

    return (
        <div className={cn(styles.container, 'sticky top-32 flex flex-col gap-4')}>
            {children}

            <section className={cn(styles.section, 'gap-2')}>
                <header className={styles.header}>
                    <Label>{t('order-summary')}</Label>
                    <Label className="text-xs">
                        {totalQuantity} {pluralize({ count: totalQuantity || 0, noun: 'item' })}
                    </Label>
                </header>

                <div className={styles.lines}>
                    <div className="flex items-center justify-between">
                        <Label className={SUMMARY_LABEL_STYLES}>{t('shipping')}</Label>
                        <div className="text-base font-bold">{'TBD*'}</div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label className={SUMMARY_LABEL_STYLES}>{t('subtotal')}</Label>
                        {cost?.subtotalAmount ? (
                            <Money
                                className="text-base font-bold"
                                data={{
                                    currencyCode: cost.subtotalAmount.currencyCode,
                                    amount:
                                        (totalSale &&
                                            (safeParseFloat(0, cost.subtotalAmount.amount) + totalSale).toString()) ||
                                        cost.subtotalAmount.amount
                                }}
                            />
                        ) : null}
                    </div>

                    {totalSale ? (
                        <>
                            {sale ? (
                                <div
                                    className={cn(styles.discounted, 'flex items-center justify-between')}
                                    title={`${salePercentage}% OFF`}
                                >
                                    <Label className={SUMMARY_LABEL_STYLES}>{t('discount')}</Label>
                                    {cartReady ? (
                                        <Money
                                            className={cn(styles.money, 'text-base font-bold')}
                                            data={{
                                                currencyCode: cost?.totalAmount?.currencyCode,
                                                amount: sale.toString()
                                            }}
                                        />
                                    ) : null}
                                </div>
                            ) : null}

                            {lines.map((line, index) => {
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
                        <div className={cn(styles.discounted, 'flex items-center justify-between')}>
                            <Label className={SUMMARY_LABEL_STYLES}>{t('promo-codes')}</Label>
                            {cartReady ? (
                                <Money
                                    className={cn(styles.money, 'text-base font-bold')}
                                    data={{
                                        currencyCode: cost?.totalAmount?.currencyCode,
                                        amount: promos.toString()
                                    }}
                                />
                            ) : null}
                        </div>
                    ) : null}

                    {cost?.totalAmount ? (
                        <div className={cn(styles.totals, 'flex items-center justify-between')}>
                            <Label className="text-xl font-bold capitalize">{t('estimated-total')}</Label>
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
                        </div>
                    ) : null}

                    <div
                        className={'text-xs font-semibold opacity-75'}
                    >{`*${t('shipping-calculated-at-checkout')}`}</div>
                </div>
            </section>

            <section className={cn(styles.section, styles['section-actions'], 'gap-2')}>
                <Button
                    className="h-10 py-0 md:h-14 md:text-base lg:text-lg"
                    disabled={!cartReady || !lines}
                    onClick={onCheckout}
                >
                    <span>{t('continue-to-checkout')}</span>
                    <FiChevronRight className={styles.icon} />
                </Button>

                {cartReady && lines.length > 0 ? (
                    <ShopPayButton
                        // TODO: Only show this if we're using Shopify.
                        width="100%"
                        className={cn(styles.button, styles['shop-button'], 'rounded-xl')}
                        variantIdsAndQuantities={lines.map(({ quantity, merchandise: { id } }: any) => ({
                            quantity,
                            id
                        }))}
                        channel="hydrogen"
                    />
                ) : null}
            </section>

            <section className={cn(styles.section, styles['section-security'], 'gap-2')}>
                {paymentMethods || null}

                <div className={'text-sm leading-snug'}>
                    <FiLock className={'stroke -mt-1 mr-1 inline h-3 stroke-2'} />
                    Safely complete your purchase through Nordcom AB&apos;s trusted partner&apos;s
                    <Link
                        href="https://www.shopify.com/security/pci-compliant"
                        rel="nofollow"
                        target="_blank"
                        className="px-1 underline"
                    >
                        PCI DSS compliant
                    </Link>
                    checkout powered by Stripe and/or Shopify.
                </div>
            </section>

            {cartReady && discountCodes.length > 0 ? (
                <section className={cn(styles.section, 'gap-2')}>
                    <CartCoupons />
                </section>
            ) : null}

            {lines.length > 0 ? (
                <section className={cn(styles.section, 'gap-2')}>
                    <header className={styles.header}>
                        <Label>{t('label-cart-note')}</Label>
                    </header>

                    <CartNote i18n={i18n} />
                </section>
            ) : null}
        </div>
    );
};

CartSummary.displayName = 'Nordcom.Cart.Summary';
export { CartSummary };
