import type { OnlineShop } from '@nordcom/commerce-db';
import { useCart } from '@shopify/hydrogen-react';
import type {
    CartAutomaticDiscountAllocation,
    CartDiscountAllocation,
    CartLine,
} from '@shopify/hydrogen-react/storefront-api-types';
import { ChevronRight as ChevronRightIcon, Lock as LockIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/actionable/button';
import { CartCoupons } from '@/components/cart/cart-coupons';
import { CartNote } from '@/components/cart/cart-note';
import styles from '@/components/cart/cart-summary.module.scss';
import Link from '@/components/link';
import { Price } from '@/components/products/price';
import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';
import { BuildConfig } from '@/utils/build-config';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';
import { pluralize } from '@/utils/pluralize';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';

/** A cart line that has both `cost` and `discountAllocations` present. */
type SaleLine = CartLine & {
    cost: NonNullable<CartLine['cost']>;
    discountAllocations: NonNullable<CartLine['discountAllocations']>;
};

/** A discount allocation whose `discountedAmount` is present. */
type AllocationWithAmount = CartDiscountAllocation & {
    discountedAmount: NonNullable<CartDiscountAllocation['discountedAmount']>;
};

/** Element type of the `lines` array returned by `useCart()`. */
type CartLineElement = NonNullable<ReturnType<typeof useCart>['lines']>[number];

const isSaleLine = (line: CartLineElement): line is SaleLine => Boolean(line && line.cost && line.discountAllocations);

const hasDiscountedAmount = (
    allocation: CartDiscountAllocation | null | undefined,
): allocation is AllocationWithAmount => Boolean(allocation?.discountedAmount);

const SUMMARY_LABEL_STYLES = 'font-medium text-sm capitalize text-gray-600 leading-none';
const PRICE_STYLES = 'text-sm font-bold';
const PRICE_DISCOUNT_STYLES = 'bg-green-200 text-green-950 rounded-lg px-1 -mx-1 font-extrabold';

// TODO: Configurable free shipping.

type CartSummaryProps = {
    shop: OnlineShop;
    onCheckout: () => void | Promise<void>;
    i18n: LocaleDictionary;

    children?: ReactNode;
    paymentMethods?: ReactNode;
};
const CartSummary = ({ onCheckout, i18n, children, paymentMethods }: CartSummaryProps) => {
    const { t } = getTranslations('cart', i18n);
    const { status, totalQuantity, lines, cost, discountCodes = [], cartReady } = useCart();
    const { currency } = useShop();

    // Only trust line-level and cost data when the cart has fully settled.
    // The `fetching`, `creating`, and `updating` states can all produce
    // transiently stale or missing line data, so zero out derived savings
    // figures until Shopify confirms the cart is `idle`.
    const isSettled = status === 'idle';

    const usableLines = (lines ?? []).filter(isSaleLine);

    const sale = isSettled
        ? usableLines.reduce(
              (sum, line) =>
                  (line.cost.compareAtAmountPerQuantity &&
                      sum +
                          (safeParseFloat(0, line.cost.compareAtAmountPerQuantity?.amount) * (line.quantity || 0) -
                              safeParseFloat(0, line.cost.totalAmount?.amount))) ||
                  sum,
              0,
          )
        : 0;
    const totalSale = isSettled
        ? sale +
          usableLines
              .map((line) => {
                  if (line.discountAllocations.length <= 0) {
                      return 0;
                  }

                  return line.discountAllocations
                      .filter(hasDiscountedAmount)
                      .reduce(
                          (sum, allocation) =>
                              (allocation.discountedAmount.amount &&
                                  sum + safeParseFloat(0, allocation.discountedAmount.amount)) ||
                              sum,
                          0,
                      );
              })
              .reduce((sum, lineTotal) => sum + lineTotal || sum, 0)
        : 0;

    // Guard the divide so a fully-discounted cart (totalAmount === 0 — gift
    // card balance covers everything, 100%-off promo, etc.) doesn't render
    // `Infinity% OFF` in the discount-row tooltip.
    const totalForPercent = safeParseFloat(0, cost?.totalAmount?.amount);
    const salePercentage = totalForPercent > 0 ? Math.round(((100 * sale) / totalForPercent) * 100) / 100 : 0;
    const promos = isSettled
        ? safeParseFloat(0, cost?.subtotalAmount?.amount) - safeParseFloat(0, cost?.totalAmount?.amount) || 0
        : 0;

    const noItems = !lines || lines.length <= 0 || !totalQuantity || totalQuantity <= 0;

    return (
        <div
            className={cn(
                styles.container,
                'sticky top-32 flex flex-col gap-4',
                !cartReady && 'pointer-events-none brightness-50',
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
                                        cost.subtotalAmount.amount,
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
                                    data-testid="cart-summary-sale"
                                    title={`${salePercentage}% OFF`}
                                >
                                    <Label className={SUMMARY_LABEL_STYLES}>{t('discount')}</Label>
                                    {cartReady ? (
                                        <Price
                                            className={cn(PRICE_STYLES, PRICE_DISCOUNT_STYLES)}
                                            data={{
                                                currencyCode: cost?.totalAmount?.currencyCode,
                                                amount: sale.toString(),
                                            }}
                                        />
                                    ) : null}
                                </div>
                            ) : null}

                            {lines && lines.flatMap((line) => line?.discountAllocations).length > 0 ? (
                                <div className="flex flex-col gap-1 pt-4">
                                    <Label className="text-gray-700 text-xs leading-none">
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
                                                    discount.discountedAmount.amount,
                                                );
                                                const title =
                                                    (discount as { title?: string }).title ||
                                                    (discount as { code?: string }).code ||
                                                    t('automatic-discounts');

                                                if (discountAmount <= 0) {
                                                    return null;
                                                }

                                                return (
                                                    <div
                                                        className={cn(
                                                            styles.discounted,
                                                            'flex items-center justify-between',
                                                        )}
                                                        key={`${line.id}-${discount.discountedAmount.amount}`}
                                                    >
                                                        <Label className={SUMMARY_LABEL_STYLES}>{title}</Label>
                                                        <Price
                                                            className={cn(PRICE_STYLES, PRICE_DISCOUNT_STYLES)}
                                                            data={{
                                                                currencyCode: cost?.totalAmount?.currencyCode,
                                                                amount: discount.discountedAmount.amount,
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
                                        amount: promos.toString(),
                                    }}
                                />
                            ) : null}
                        </div>
                    ) : null}

                    <div className={cn(styles.totals, 'flex items-center justify-between pt-1')}>
                        <Label className="font-bold text-xl capitalize">{t('estimated-total')}</Label>
                        {cost && !noItems ? (
                            <Price
                                className={PRICE_STYLES}
                                data={
                                    cost.checkoutChargeAmount ||
                                    cost.totalAmount || {
                                        currencyCode: currency,
                                        amount: '0',
                                    }
                                }
                            />
                        ) : (
                            <div className={PRICE_STYLES}>...</div>
                        )}
                    </div>

                    <div
                        className={'font-semibold text-xs opacity-75'}
                    >{`*${t('shipping-calculated-at-checkout')}`}</div>
                </div>
            </section>

            {BuildConfig.environment === 'development' ? (
                <section className={cn(styles.section, 'gap-2 empty:hidden')}>
                    {lines
                        ?.filter(Boolean)
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
                                                <Price data={discountedAmount} className="font-bold text-sm" />
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={index} className="flex items-center justify-between">
                                            <Label>discount</Label>
                                            <Price data={discountedAmount} className="font-bold text-sm" />
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
                                                    ({ name, value }) => `${name}: ${value}`,
                                                ),
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
