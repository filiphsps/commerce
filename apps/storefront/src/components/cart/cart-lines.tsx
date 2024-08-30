'use client';

import { Suspense } from 'react';

import { type LocaleDictionary, useTranslation } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';

import { Button } from '@/components/actionable/button';
import { CartLine } from '@/components/cart/cart-line';
import { Label } from '@/components/typography/label';

type CartContentProps = {
    i18n: LocaleDictionary;
};
const CartLines = ({ i18n }: CartContentProps) => {
    const { t } = useTranslation('cart', i18n);

    const { cartReady, lines = [], linesRemove } = useCart();

    if (!cartReady) {
        return <CartLines.skeleton />;
    }

    if (cartReady && lines.length <= 0) {
        return <Label>There are no items in your cart.</Label>;
    }

    return (
        <div className="flex w-full flex-col gap-2 empty:hidden">
            <div className="-mt-4 flex h-2 w-full select-none flex-row-reverse items-center justify-between pb-3">
                <Button
                    as={Label}
                    className="inline-flex cursor-pointer text-xs hover:text-red-500"
                    styled={false}
                    onClick={() => linesRemove(lines.map((line) => line?.id).filter((_) => _) as string[])}
                >
                    {t('clear-cart')}
                </Button>
            </div>

            {lines.map((item) => {
                if (!item) return null;

                return (
                    <>
                        <Suspense fallback={<CartLine.skeleton />} key={item.id}>
                            <CartLine i18n={i18n} data={item as any} />
                        </Suspense>
                    </>
                );
            })}
        </div>
    );
};

CartLines.skeleton = () => {
    return (
        <section className="flex w-full flex-col gap-2">
            <div className={'h-24 w-full rounded-lg bg-gray-200 p-4'} data-skeleton />
            <div className={'h-24 w-full rounded-lg bg-gray-200 p-4'} data-skeleton />
            <div className={'h-24 w-full rounded-lg bg-gray-200 p-4'} data-skeleton />
        </section>
    );
};

CartLines.displayName = 'Nordcom.Cart.Lines';
export { CartLines };
