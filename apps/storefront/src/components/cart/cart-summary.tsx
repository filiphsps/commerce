import styles from '@/components/cart/cart-summary.module.scss';

import { useEffect, useState } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { BuildConfig } from '@/utils/build-config';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';
import { pluralize } from '@/utils/pluralize';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';
import { ChevronRight as ChevronRightIcon, Lock as LockIcon } from 'lucide-react';

import { Button } from '@/components/actionable/button';
import { CartCoupons } from '@/components/cart/cart-coupons';
import { CartNote } from '@/components/cart/cart-note';
import Link from '@/components/link';
import { Price } from '@/components/products/price';
import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';

import type { CartAutomaticDiscountAllocation, CartLine } from '@shopify/hydrogen-react/storefront-api-types';
import type { ReactNode } from 'react';

const SUMMARY_LABEL_STYLES = 'font-medium text-sm capitalize text-gray-600 leading-none';
const PRICE_STYLES = 'text-sm font-bold';
const PRICE_DISCOUNT_STYLES = 'bg-green-200 text-green-950 rounded-lg px-1 -mx-1 font-extrabold';

// TODO: Configurable free shipping.

type CartSummaryProps = {
    shop: OnlineShop;
    onCheckout: any;
    i18n: LocaleDictionary;

    children?: ReactNode;
    paymentMethods?: ReactNode;
};
const CartSummary = ({ onCheckout, i18n, children, paymentMethods }: CartSummaryProps) => {
    const { t } = getTranslations('cart', i18n);
    const { totalQuantity, lines, cost, note, discountCodes = [], cartReady } = useCart();
    const { currency } = useShop();
    const [showNote, setShowNote] = useState(false);

    useEffect(() => {
        if (!note || showNote) return;

        setShowNote(showNote);
    }, [note]);
    const sale =
        (lines &&
            lines.reduce(
                (sum, line) =>
                    (line!.cost!.compareAtAmountPerQuantity &&
                        sum +
                            (safeParseFloat(0, line?.cost?.compareAtAmountPerQuantity?.amount) * (line!.quantity || 0) -
                                safeParseFloat(0, line?.cost?.totalAmount?.amount))) ||
                    sum,
                0
            )) ||
        0;
    const totalSale =
        sale +
        (lines || [])
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

    const noItems = !lines || lines.length <= 0 || !totalQuantity || totalQuantity <= 0;

    return (
        <div
            className={cn(
                styles.container,
                'sticky top-32 flex flex-col gap-4',
                !cartReady && 'pointer-events-none brightness-50'
            )}
        >
            {children}

            <section className={cn(styles.section, 'gap-1')}>
                <header className={styles.header}>
                    <Label>{t('order-summary')}</Label>
                    <Label className="text-xs">
                        {totalQuantity} {pluralize({ count: totalQuantity || 0, noun: 'item' })}
                    </Label>
                </header>

                <div className={cn(styles.lines, 'gap-1')}>
                    <div className="flex items-center justify-between">
                        <Label className={SUMMARY_LABEL_STYLES}>{t('shipping')}</Label>
                        <div className={PRICE_STYLES}>{'TBD*'}</div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label className={SUMMARY_LABEL_STYLES}>{t('subtotal')}</Label>
                        {cost?.subtotalAmount && !noItems ? (
                            <Price
                                className={PRICE_STYLES}
                                data={{
                                    currencyCode: cost.subtotalAmount.currencyCode,
                                    amount:
                                        (totalSale &&
                                            (safeParseFloat(0, cost.subtotalAmount.amount) + totalSale).toString()) ||
                                        cost.subtotalAmount.amount
                                }}
                            />
                        ) : (
                            <div className={PRICE_STYLES}>...</div>
                        )}
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
                                        <Price
                                            className={cn(PRICE_STYLES, PRICE_DISCOUNT_STYLES)}
                                            data={{
                                                currencyCode: cost?.totalAmount?.currencyCode,
                                                amount: sale.toString()
                                            }}
                                        />
                                    ) : null}
                                </div>
                            ) : null}

                            {lines && lines.flatMap((line) => line?.discountAllocations).length > 0 ? (
                                <div className="flex flex-col gap-1 pt-4">
                                    <Label className="text-xs leading-none text-gray-700">
                                        {t('automatic-discounts')}
                                    </Label>

                                    <div className="flex flex-col gap-2">
                                        {lines.map((line) => {
                                            if (!line) {
                                                return null;
                                            }

                                            return line.discountAllocations?.map((discount) => {
                                                if (!discount?.discountedAmount) {
                                                    return null;
                                                }

                                                const discountAmount = safeParseFloat(
                                                    0,
                                                    discount.discountedAmount.amount
                                                );
                                                const title = (discount as any).title || t('automatic-discounts');

                                                if (discountAmount <= 0) {
                                                    return null;
                                                }

                                                return (
                                                    <div
                                                        className={cn(
                                                            styles.discounted,
                                                            'flex items-center justify-between'
                                                        )}
                                                        key={`${line.id}-${discount.discountedAmount.amount}`}
                                                    >
                                                        <Label className={SUMMARY_LABEL_STYLES}>{title}</Label>
                                                        <Price
                                                            className={cn(PRICE_STYLES, PRICE_DISCOUNT_STYLES)}
                                                            data={{
                                                                currencyCode: cost?.totalAmount?.currencyCode,
                                                                amount: discount.discountedAmount.amount
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            });
                                        })}
                                    </div>
                                </div>
                            ) : null}
                        </>
                    ) : null}

                    {promos && !noItems ? (
                        <div className={cn(styles.discounted, 'flex items-center justify-between')}>
                            <Label className={SUMMARY_LABEL_STYLES}>{t('promo-codes')}</Label>
                            {cartReady ? (
                                <Price
                                    className={cn(PRICE_STYLES, PRICE_DISCOUNT_STYLES)}
                                    data={{
                                        currencyCode: cost?.totalAmount?.currencyCode,
                                        amount: promos.toString()
                                    }}
                                />
                            ) : null}
                        </div>
                    ) : null}

                    <div className={cn(styles.totals, 'flex items-center justify-between pt-1')}>
                        <Label className="text-xl font-bold capitalize">{t('estimated-total')}</Label>
                        {cost && !noItems ? (
                            <Price
                                className={PRICE_STYLES}
                                data={
                                    cost.checkoutChargeAmount ||
                                    (cost.totalAmount as any) || {
                                        currencyCode: currency,
                                        amount: 0
                                    }
                                }
                            />
                        ) : (
                            <div className={PRICE_STYLES}>...</div>
                        )}
                    </div>

                    <div
                        className={'text-xs font-semibold opacity-75'}
                    >{`*${t('shipping-calculated-at-checkout')}`}</div>
                </div>
            </section>

            {BuildConfig.environment === 'development' ? (
                <section className={cn(styles.section, 'gap-2 empty:hidden')}>
                    {lines &&
                        lines
                            .filter(Boolean)
                            .map((line) => line as CartLine)
                            .map(({ id, merchandise: { product, ...variant }, discountAllocations }) => {
                                const discountLineElements = discountAllocations
                                    .map((discount, index) => {
                                        const { discountedAmount } = discount;
                                        const amount = safeParseFloat(0, discountedAmount.amount);

                                        if (amount <= 0) {
                                            return null;
                                        }

                                        if (Object.hasOwn(discount, 'title')) {
                                            const { title } = discount as CartAutomaticDiscountAllocation;
                                            return (
                                                <div key={index} className="flex items-center justify-between">
                                                    <Label>{title}</Label>
                                                    <Price data={discountedAmount} className="text-sm font-bold" />
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={index} className="flex items-center justify-between">
                                                <Label>discount</Label>
                                                <Price data={discountedAmount} className="text-sm font-bold" />
                                            </div>
                                        );
                                    })
                                    .filter(Boolean);

                                if (!discountLineElements.length) {
                                    return null;
                                }

                                const { vendor, title, productType } = product;

                                return (
                                    <div key={id} className="flex flex-col">
                                        <Label className="flex gap-1 normal-case">
                                            <span>
                                                {vendor} {title}
                                            </span>
                                            &ndash;
                                            <span className="font-bold">
                                                {[
                                                    ...(productType ? [productType] : []),
                                                    ...variant.selectedOptions.map(
                                                        ({ name, value }) => `${name}: ${value}`
                                                    )
                                                ].join(', ')}
                                            </span>
                                        </Label>

                                        <div className="flex flex-col">{discountLineElements}</div>
                                    </div>
                                );
                            })}
                </section>
            ) : null}

            <section className={cn(styles.section, styles['section-actions'], 'gap-2')}>
                <Button
                    className="h-10 py-0 md:h-14 md:text-base lg:text-lg"
                    disabled={!cartReady || noItems}
                    onClick={onCheckout}
                >
                    <span>{t('continue-to-checkout')}</span>
                    <ChevronRightIcon className={styles.icon} />
                </Button>
            </section>

            <section className={cn(styles.section, styles['section-security'], 'gap-2')}>
                {paymentMethods || null}

                <div className={'text-sm leading-snug'}>
                    <LockIcon className="stroke -mt-1 mr-1 inline h-3 stroke-2" />
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

            {lines && lines.length > 0 ? (
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
