'use client';

import { useCartCount } from '@nordcom/cart-react';
import { ShoppingBag as ShoppingBagIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/actionable/button';
import Link from '@/components/link';
import { capitalize, getTranslations, type Locale, type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';

export type CartButtonProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
/**
 * Header cart button showing item count and linking to the cart page.
 *
 * @param props.locale - Active locale forwarded to the cart link.
 * @param props.i18n - Locale dictionary for the cart link title.
 * @returns The cart link button with optional item count badge.
 */
const CartButton = ({ locale, i18n }: CartButtonProps) => {
    const { t } = getTranslations('cart', i18n);
    const totalQuantity = useCartCount();

    // Stamp the count badge whenever the quantity increases (add-to-cart). `previousQuantity`
    // starts `null` so the first settled render only records the baseline — the badge must not
    // stamp on initial hydration, only on a real increment driven by user action.
    const previousQuantity = useRef<number | null>(null);
    const [bump, setBump] = useState(false);
    useEffect(() => {
        const previous = previousQuantity.current;
        previousQuantity.current = totalQuantity;
        if (previous !== null && totalQuantity > previous) {
            setBump(true);
        }
    }, [totalQuantity]);
    const clearBump = useCallback(() => setBump(false), []);

    return (
        <Button
            as={Link}
            href="/cart/"
            locale={locale}
            className={cn(
                'group grid h-10 grid-cols-[auto_1fr] grid-rows-[1fr] items-center justify-center gap-0 overflow-clip rounded-none bg-transparent p-0 py-0 text-center leading-none transition-all duration-250 *:leading-snug',
                totalQuantity &&
                    'gap-2 rounded-3xl bg-primary fill-primary-foreground stroke-primary-foreground px-4 text-primary-foreground shadow',
                !totalQuantity && 'text-base text-black shadow-none hover:shadow-none',
            )}
            data-items={totalQuantity || 0}
            title={capitalize(t('view-cart'))}
        >
            <div
                className={cn(
                    'text-left font-extrabold text-base transition-colors',
                    !totalQuantity && 'w-0',
                    bump &&
                        'motion-safe:animate-[chip-stamp_var(--product-card-motion-fast)_var(--product-card-motion-ease)]',
                )}
                data-cart-count={totalQuantity || 0}
                onAnimationEnd={clearBump}
                suppressHydrationWarning={true}
            >
                {totalQuantity || null}
            </div>

            <ShoppingBagIcon
                className={cn(
                    'block overflow-hidden stroke-1 text-right text-base transition-all',
                    !totalQuantity && 'h-6 group-hover:text-primary',
                )}
                suppressHydrationWarning={true}
            />
        </Button>
    );
};
CartButton.displayName = 'Nordcom.Header.CartButton';

export { CartButton };
