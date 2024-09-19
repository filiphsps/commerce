'use client';

import { Suspense } from 'react';

import { getTranslations, type LocaleDictionary } from '@/utils/locale';
import { useCart } from '@shopify/hydrogen-react';

import { Button } from '@/components/actionable/button';
import { CartLine } from '@/components/cart/cart-line';
import { Label } from '@/components/typography/label';

type CartContentProps = {
    i18n: LocaleDictionary;
};
const CartLines = ({ i18n }: CartContentProps) => {
    const { t } = getTranslations('common', i18n);
    const { t: tCart } = getTranslations('cart', i18n);

    const { cartReady, lines, linesRemove } = useCart();

    if (!cartReady || typeof lines === 'undefined') {
        return <CartLines.skeleton />;
    }

    if (lines.length <= 0) {
        return <Label>There are no items in your cart.</Label>;
    }

    return (
        <div className="flex w-full flex-col gap-2">
            <div className="-mt-4 flex h-2 w-full select-none flex-row-reverse items-center justify-between pb-3">
                <Button
                    as={Label as any}
                    className="inline-flex cursor-pointer text-xs text-gray-600 hover:text-red-500"
                    styled={false}
                    onClick={() => linesRemove(lines.map((line) => line?.id).filter((_) => _) as string[])}
                >
                    {tCart('clear-cart')}
                </Button>
            </div>

            <div className="flex h-full w-full flex-col empty:hidden">
                <header className="text-gray-00 grid grid-cols-[8rem_1fr] grid-rows-[1fr] items-end gap-3 py-1">
                    <div>
                        <Label className="text-inherit">{t('product')}</Label>
                    </div>
                    <div className="grid h-full w-full grid-cols-[7fr_3fr_4fr] grid-rows-[1fr] items-start gap-3">
                        <div />
                        <div className="flex h-full w-full flex-col items-center">
                            <Label className="text-inherit">{t('quantity')}</Label>
                        </div>
                        <div className="flex h-full w-full flex-col items-end">
                            <Label className="text-inherit">{t('price')}</Label>
                        </div>
                    </div>
                </header>

                {lines.map((item) => {
                    if (!item) {
                        return null;
                    }

                    return (
                        <Suspense fallback={<CartLine.skeleton />} key={item.id}>
                            <CartLine i18n={i18n} data={item as any} />
                        </Suspense>
                    );
                })}
            </div>
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
