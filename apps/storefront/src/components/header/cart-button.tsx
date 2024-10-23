'use client';

import { capitalize, getTranslations, type Locale, type LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import { useCart } from '@shopify/hydrogen-react';
import { ShoppingBag as ShoppingBagIcon } from 'lucide-react';

import { Button } from '@/components/actionable/button';
import Link from '@/components/link';

export type CartButtonProps = {
    locale: Locale;
    i18n: LocaleDictionary;
};
const CartButton = ({ locale, i18n }: CartButtonProps) => {
    const { t } = getTranslations('cart', i18n);
    const { totalQuantity } = useCart();

    return (
        <Button
            as={Link}
            href="/cart/"
            locale={locale}
            className={cn(
                'duration-250 group grid h-10 grid-cols-[auto_1fr] grid-rows-[1fr] items-center justify-center gap-0 overflow-clip rounded-none bg-transparent p-0 py-0 text-center leading-none transition-all *:leading-snug',
                totalQuantity &&
                    'bg-primary text-primary-foreground fill-primary-foreground stroke-primary-foreground gap-2 rounded-3xl px-4 shadow',
                !totalQuantity && 'text-base text-black shadow-none hover:shadow-none'
            )}
            data-items={totalQuantity || 0}
            title={capitalize(t('view-cart'))}
        >
            <div
                className={cn('text-left text-base font-extrabold transition-colors', !totalQuantity && 'w-0')}
                suppressHydrationWarning={true}
            >
                {totalQuantity || null}
            </div>

            <ShoppingBagIcon
                className={cn(
                    'block overflow-hidden stroke-1 text-right text-base transition-all',
                    !totalQuantity && 'group-hover:text-primary h-6'
                )}
                suppressHydrationWarning={true}
            />
        </Button>
    );
};
CartButton.displayName = 'Nordcom.Header.CartButton';

export { CartButton };
