'use client';

import type { CartLine } from '@nordcom/cart-core';
import {
    useCartCost,
    useCartCount,
    useCartLines as useCartLinesSlice,
    useCartMeta,
    useCartStatus,
} from '@nordcom/cart-react';
import type { OnlineShop } from '@nordcom/commerce-db';
import { isDevelopment } from '@nordcom/commerce-utils';
import { ChevronRight as ChevronRightIcon, Lock as LockIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/actionable/button';
import { CartCoupons } from '@/components/cart/cart-coupons';
import { CartNote } from '@/components/cart/cart-note';
import Link from '@/components/link';
import { Price } from '@/components/products/price';
import { useShop } from '@/components/shop/provider';
import { Label } from '@/components/typography/label';
import { type CurrencyCode, getTranslations, type LocaleDictionary } from '@/utils/locale';
import { pluralize } from '@/utils/pluralize';
import { safeParseFloat } from '@/utils/pricing';
import { cn } from '@/utils/tailwind';

const SUMMARY_LABEL_STYLES = 'font-medium text-sm capitalize text-(color:var(--text-muted)) leading-none';
const PRICE_STYLES = 'text-sm font-bold';
const PRICE_DISCOUNT_STYLES =
    'bg-(--surface-success) text-(--text-success-strong) rounded-lg px-1 -mx-1 font-extrabold';

const SECTION_STYLES =
    'flex flex-col p-[var(--block-padding-large)] rounded-[var(--block-border-radius)] bg-[var(--color-block)] text-[color:var(--color-dark)] transition-all duration-150 ease-in-out';
const HEADER_STYLES = 'grid grid-cols-[1fr_auto] gap-[var(--block-spacer)]';

type SummaryRowProps = {
    label: ReactNode;
    children: ReactNode;
    className?: string;
    labelClassName?: string;
    title?: string;
    'data-testid'?: string;
};

/**
 * One label/value line in the order summary (shipping, subtotal, discount, promo, …). Consolidates the
 * shared `flex justify-between` row + muted `Label` so every summary line stays visually consistent and
 * the value (a `Price`, plain text, or `null` while loading) is passed as `children`.
 *
 * @param props.label - The row's leading label text.
 * @param props.children - The trailing value, e.g. a `Price` or status text.
 * @param props.className - Extra classes for the row wrapper.
 * @param props.labelClassName - Extra classes merged onto the label (over the shared muted styles).
 * @param props.title - Optional native tooltip for the row (e.g. the discount percentage).
 * @param props.data-testid - Optional test hook forwarded to the row wrapper.
 * @returns The summary row element.
 */
const SummaryRow = ({ label, children, className, labelClassName, title, 'data-testid': testId }: SummaryRowProps) => (
    <div className={cn('flex items-center justify-between', className)} title={title} data-testid={testId}>
        <Label className={cn(SUMMARY_LABEL_STYLES, labelClassName)}>{label}</Label>
        {children}
    </div>
);
SummaryRow.displayName = 'Nordcom.Cart.SummaryRow';

// TODO: Configurable free shipping.

type CartSummaryProps = {
    shop: OnlineShop;
    onCheckout: () => void | Promise<void>;
    i18n: LocaleDictionary;

    children?: ReactNode;
    paymentMethods?: ReactNode;
};
/**
 * Sticky order-summary sidebar with subtotal, discount rows, a checkout button,
 * payment-method logos, and the cart note field.
 *
 * @param props.shop - Shop record (currently unused; reserved for free-shipping config).
 * @param props.onCheckout - Callback invoked when the checkout button is clicked.
 * @param props.i18n - Locale dictionary for translated labels.
 * @param props.children - Optional slot rendered above the order summary section.
 * @param props.paymentMethods - Optional payment method icons rendered in the trust footer.
 * @returns The cart summary panel.
 */
const CartSummary = ({ onCheckout, i18n, children, paymentMethods }: CartSummaryProps) => {
    const { t } = getTranslations('cart', i18n);
    const { status, cartReady } = useCartStatus();
    const totalQuantity = useCartCount();
    const { lines } = useCartLinesSlice();
    const cost = useCartCost();
    const { discountCodes } = useCartMeta();
    const { currency } = useShop();

    // Only trust line-level and cost data when the cart has fully settled.
    // The `mutating` state can produce transiently stale or missing line data,
    // so zero out derived savings figures until the provider returns to idle.
    const isSettled = status === 'idle';

    const sale = isSettled
        ? lines.reduce((sum, line) => {
              const compareAt = line.merchandise.compareAtUnitPrice;
              if (!compareAt) return sum;
              const compareAtTotal = safeParseFloat(0, compareAt.amount) * (line.quantity || 0);
              const lineTotal = safeParseFloat(0, line.cost.total?.amount);
              return sum + Math.max(0, compareAtTotal - lineTotal);
          }, 0)
        : 0;

    const totalSale = isSettled
        ? sale +
          lines.reduce((sum, line) => {
              if (!line.discountAllocations || line.discountAllocations.length <= 0) {
                  return sum;
              }
              return (
                  sum +
                  line.discountAllocations.reduce(
                      (lineSum, allocation) => lineSum + safeParseFloat(0, allocation.discountedAmount?.amount),
                      0,
                  )
              );
          }, 0)
        : 0;

    // Guard the divide so a fully-discounted cart (total === 0 — gift
    // card balance covers everything, 100%-off promo, etc.) doesn't render
    // `Infinity% OFF` in the discount-row tooltip.
    const totalForPercent = safeParseFloat(0, cost.total?.amount);
    const salePercentage = totalForPercent > 0 ? Math.round(((100 * sale) / totalForPercent) * 100) / 100 : 0;
    const promos = isSettled
        ? safeParseFloat(0, cost.subtotal?.amount) - safeParseFloat(0, cost.total?.amount) || 0
        : 0;

    const noItems = lines.length <= 0 || !totalQuantity || totalQuantity <= 0;

    const currencyCode = (cost.total?.currencyCode ?? cost.subtotal?.currencyCode ?? currency) as CurrencyCode;

    return (
        <div
            data-display="cost"
            className={cn('sticky top-32 flex flex-col gap-4', !cartReady && 'pointer-events-none brightness-50')}
        >
            {children}

            <section className={cn(SECTION_STYLES, 'gap-1')}>
                <header className={HEADER_STYLES}>
                    <Label>{t('order-summary')}</Label>
                    <Label className="text-xs">
                        {totalQuantity} {pluralize({ count: totalQuantity || 0, noun: 'item' })}
                    </Label>
                </header>

                <div className="flex flex-col gap-1">
                    <SummaryRow label={t('shipping')}>
                        <div className={PRICE_STYLES}>{'TBD*'}</div>
                    </SummaryRow>

                    <SummaryRow label={t('subtotal')}>
                        {cost.subtotal && !noItems ? (
                            <Price
                                className={PRICE_STYLES}
                                data={{
                                    currencyCode: cost.subtotal.currencyCode as CurrencyCode,
                                    amount:
                                        (totalSale &&
                                            (safeParseFloat(0, cost.subtotal.amount) + totalSale).toString()) ||
                                        cost.subtotal.amount,
                                }}
                            />
                        ) : (
                            <div className={PRICE_STYLES}>...</div>
                        )}
                    </SummaryRow>

                    {totalSale ? (
                        <>
                            {sale ? (
                                <SummaryRow
                                    label={t('discount')}
                                    data-testid="cart-summary-sale"
                                    title={`${salePercentage}% OFF`}
                                >
                                    {cartReady ? (
                                        <Price
                                            className={cn(PRICE_STYLES, PRICE_DISCOUNT_STYLES)}
                                            data={{
                                                currencyCode,
                                                amount: sale.toString(),
                                            }}
                                        />
                                    ) : null}
                                </SummaryRow>
                            ) : null}

                            {lines.flatMap((line) => line.discountAllocations ?? []).length > 0 ? (
                                <div className="flex flex-col gap-1 pt-4">
                                    <Label className="text-(color:var(--text-muted)) text-xs leading-none">
                                        {t('automatic-discounts')}
                                    </Label>

                                    <div className="flex flex-col gap-2">
                                        {lines.map((line) =>
                                            (line.discountAllocations ?? []).map((discount) => {
                                                if (!discount?.discountedAmount) {
                                                    return null;
                                                }

                                                const discountAmount = safeParseFloat(
                                                    0,
                                                    discount.discountedAmount.amount,
                                                );
                                                const title =
                                                    discount.title || discount.code || t('automatic-discounts');

                                                if (discountAmount <= 0) {
                                                    return null;
                                                }

                                                return (
                                                    <SummaryRow
                                                        className="gap-2"
                                                        labelClassName="min-w-0 truncate"
                                                        label={title}
                                                        key={`${line.id}-${discount.discountedAmount.amount}`}
                                                    >
                                                        <Price
                                                            className={cn(
                                                                PRICE_STYLES,
                                                                PRICE_DISCOUNT_STYLES,
                                                                'shrink-0 whitespace-nowrap',
                                                            )}
                                                            data={{
                                                                currencyCode: currencyCode,
                                                                amount: discount.discountedAmount.amount,
                                                            }}
                                                        />
                                                    </SummaryRow>
                                                );
                                            }),
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </>
                    ) : null}

                    {promos && !noItems ? (
                        <SummaryRow label={t('promo-codes')}>
                            {cartReady ? (
                                <Price
                                    className={cn(PRICE_STYLES, PRICE_DISCOUNT_STYLES)}
                                    data={{
                                        currencyCode,
                                        amount: promos.toString(),
                                    }}
                                />
                            ) : null}
                        </SummaryRow>
                    ) : null}

                    <div className="mt-[var(--block-padding-small)] flex items-center justify-between pt-1 [border-top:calc(var(--block-border-width)/1.5)_dotted_var(--color-gray)]">
                        <Label className="font-bold text-xl capitalize">{t('estimated-total')}</Label>
                        {(cost.total || cost.subtotal) && !noItems ? (
                            <Price
                                className={PRICE_STYLES}
                                data={(cost.total ?? cost.subtotal ?? { currencyCode: currency, amount: '0' }) as never}
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

            {isDevelopment() ? (
                <section className={cn(SECTION_STYLES, 'gap-2 empty:hidden')}>
                    {(lines as CartLine[]).map((line) => {
                        const discountLineElements = (line.discountAllocations ?? [])
                            .map((discount, index) => {
                                const { discountedAmount, title } = discount;
                                const amount = safeParseFloat(0, discountedAmount?.amount);

                                if (amount <= 0) {
                                    return null;
                                }

                                if (title) {
                                    return (
                                        <div key={index} className="flex items-center justify-between">
                                            <Label>{title}</Label>
                                            <Price data={discountedAmount as never} className="font-bold text-sm" />
                                        </div>
                                    );
                                }

                                return (
                                    <div key={index} className="flex items-center justify-between">
                                        <Label>{t('discount')}</Label>
                                        <Price data={discountedAmount as never} className="font-bold text-sm" />
                                    </div>
                                );
                            })
                            .filter(Boolean);

                        if (!discountLineElements.length) {
                            return null;
                        }

                        const { productVendor, productTitle, productType, variantTitle, selectedOptions } =
                            line.merchandise;

                        return (
                            <div key={line.id} className="flex flex-col">
                                <Label className="flex gap-1 normal-case">
                                    <span>
                                        {productVendor} {productTitle}
                                    </span>
                                    &ndash;
                                    <span className="font-bold">
                                        {[
                                            ...(productType ? [productType] : []),
                                            ...(variantTitle ? [variantTitle] : []),
                                            ...selectedOptions.map(({ name, value }) => `${name}: ${value}`),
                                        ].join(', ')}
                                    </span>
                                </Label>

                                <div className="flex flex-col">{discountLineElements}</div>
                            </div>
                        );
                    })}
                </section>
            ) : null}

            <section className="flex flex-col gap-2">
                <Button
                    className="h-10 py-0 md:h-14 md:text-base lg:text-lg"
                    disabled={!cartReady || noItems}
                    onClick={onCheckout}
                >
                    <span>{t('continue-to-checkout')}</span>
                    <ChevronRightIcon />
                </Button>
            </section>

            <section className={cn(SECTION_STYLES, 'mt-[var(--block-spacer-huge)] gap-2 text-center')}>
                {paymentMethods || null}

                <div className={'text-sm leading-snug'}>
                    <LockIcon className="-mt-1 mr-1 inline size-3 stroke-2" />
                    {t(
                        'secure-checkout',
                        <Link
                            key="pci"
                            href="https://www.shopify.com/security/pci-compliant"
                            rel="nofollow"
                            target="_blank"
                            className="px-1 underline"
                        >
                            PCI DSS compliant
                        </Link>,
                    )}
                </div>
            </section>

            {cartReady && discountCodes.length > 0 ? (
                <section className={cn(SECTION_STYLES, 'gap-2')}>
                    <CartCoupons i18n={i18n} />
                </section>
            ) : null}

            {lines.length > 0 ? (
                <section className={cn(SECTION_STYLES, 'gap-2')}>
                    <header className={HEADER_STYLES}>
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
