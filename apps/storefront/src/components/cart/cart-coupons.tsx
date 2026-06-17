'use client';

import { useCartActions, useCartMeta, useCartStatus } from '@nordcom/cart-react';
import { Tag as TagIcon, X as XIcon } from 'lucide-react';
import type { AppCartCaps } from '@/cart/caps';
import { Button } from '@/components/actionable/button';
import { Label } from '@/components/typography/label';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

/**
 * Displays active discount codes on the cart and provides a button to remove each one.
 *
 * @param props.i18n - Locale dictionary for the heading and per-code remove labels.
 * @returns The coupon list section, or `null` when the cart is not ready or has no active discounts.
 */
const CartCoupons = ({ i18n }: { i18n: LocaleDictionary }) => {
    const { discountCodes } = useCartMeta();
    const { cartReady } = useCartStatus();
    const { removeDiscountCode } = useCartActions<AppCartCaps>();
    const { t } = getTranslations('cart', i18n);

    if (!cartReady || discountCodes.length <= 0) {
        return null;
    }

    return (
        <section className="flex flex-col items-start justify-start gap-2">
            <Label>{t('active-discounts')}</Label>

            <ul aria-label={t('active-discounts')} className="flex flex-wrap gap-2">
                {discountCodes.map(({ code }) => (
                    <li
                        key={code}
                        className="flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-(--surface-0) px-3 py-2"
                    >
                        <TagIcon className="text-(color:var(--text-muted)) size-4" aria-hidden={true} />

                        <Label>{code}</Label>

                        <Button
                            styled={false}
                            className="focus-ring text-(color:var(--text-muted)) hover:text-(color:var(--state-danger)) focus-visible:text-(color:var(--state-danger)) -mr-1 flex items-center justify-center rounded-md p-1 transition-colors"
                            type="button"
                            aria-label={t('remove-discount', code)}
                            title={t('remove-discount', code)}
                            onClick={() => {
                                void removeDiscountCode(code);
                            }}
                        >
                            <XIcon className="size-4" strokeWidth={2.5} />
                        </Button>
                    </li>
                ))}
            </ul>
        </section>
    );
};

CartCoupons.displayName = 'Nordcom.Cart.Coupons';

export { CartCoupons };
