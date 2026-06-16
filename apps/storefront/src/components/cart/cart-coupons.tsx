'use client';

import { useCartActions, useCartMeta, useCartStatus } from '@nordcom/cart-react';
import { Tag as TagIcon, X as XIcon } from 'lucide-react';
import type { AppCartCaps } from '@/cart/caps';
import { Button } from '@/components/actionable/button';
import { Label } from '@/components/typography/label';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

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

            <div className={cn('flex flex-wrap gap-2')}>
                {discountCodes.map(({ code }) => (
                    <div
                        key={code}
                        className="flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-(--surface-0) px-3 py-2"
                    >
                        <TagIcon className="" />

                        <Label>{code}</Label>

                        <Button
                            styled={false}
                            className="contents"
                            type="button"
                            aria-label={t('remove-discount', code)}
                            title={t('remove-discount', code)}
                            onClick={() => {
                                void removeDiscountCode(code);
                            }}
                        >
                            <XIcon
                                className="h-4 text-lg transition-colors hover:fill-(--state-danger) hover:stroke-(--state-danger)"
                                style={{ strokeWidth: 2.5 }}
                            />
                        </Button>
                    </div>
                ))}
            </div>
        </section>
    );
};

CartCoupons.displayName = 'Nordcom.Cart.Coupons';

export { CartCoupons };
