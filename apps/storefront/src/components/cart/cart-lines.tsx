'use client';

import { useCart } from '@shopify/hydrogen-react';
import type { CartLine as ShopifyCartLine } from '@shopify/hydrogen-react/storefront-api-types';
import { Suspense } from 'react';
import { Button } from '@/components/actionable/button';
import { ExportCartButton } from '@/components/actionable/export-cart-button';
import { CartLine } from '@/components/cart/cart-line';
import { Label } from '@/components/typography/label';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

type CartContentProps = {
    i18n: LocaleDictionary;
};
const CartLines = ({ i18n }: CartContentProps) => {
    const { t: tCart } = getTranslations('cart', i18n);

    const { cartReady, lines, linesRemove, totalQuantity } = useCart();

    if (!cartReady || typeof lines === 'undefined') {
        return <CartLines.skeleton />;
    }

    if (lines.length <= 0 || !totalQuantity || totalQuantity <= 0) {
        return <Label>There are no items in your cart.</Label>;
    }

    return (
        <div className="flex w-full flex-col gap-2">
            <div className="flex w-full items-center justify-between border-0 border-gray-200 border-b border-solid pb-1 text-gray-600 md:border-0 md:px-1 md:pb-0">
                <Button
                    as={Label}
                    className="inline-flex cursor-pointer font-bold text-sm hover:text-red-500"
                    styled={false}
                    onClick={() => linesRemove(lines.map((line) => line?.id).filter((_) => _) as string[])}
                >
                    {tCart('clear-cart')}
                </Button>

                <ExportCartButton i18n={i18n} />
            </div>

            <section className="flex h-full w-full flex-col gap-3 empty:hidden md:gap-3">
                {lines.map((item) => {
                    if (!item) {
                        return null;
                    }

                    return (
                        <Suspense fallback={<CartLine.skeleton />} key={item.id}>
                            <CartLine i18n={i18n} data={item as ShopifyCartLine} />
                        </Suspense>
                    );
                })}
            </section>
        </div>
    );
};

CartLines.skeleton = () => {
    return (
        <section className="flex w-full flex-col gap-1">
            <div className={'h-24 w-full rounded-lg bg-gray-200 p-4'} data-skeleton />
            <div className={'h-24 w-full rounded-lg bg-gray-200 p-4'} data-skeleton />
            <div className={'h-24 w-full rounded-lg bg-gray-200 p-4'} data-skeleton />
        </section>
    );
};

CartLines.displayName = 'Nordcom.Cart.Lines';

export { CartLines };
