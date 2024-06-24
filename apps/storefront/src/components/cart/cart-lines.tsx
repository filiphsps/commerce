'use client';

import { Suspense } from 'react';

import type { Shop } from '@nordcom/commerce-database';

import { useCart } from '@shopify/hydrogen-react';

import { CartLine } from '@/components/cart/cart-line';
import { Label } from '@/components/typography/label';

import type { LocaleDictionary } from '@/utils/locale';

type CartContentProps = {
    shop: Shop;
    i18n: LocaleDictionary;
};
const CartLines = ({ shop, i18n }: CartContentProps) => {
    const { cartReady, lines } = useCart();

    if (!cartReady) {
        return <CartLines.skeleton />;
    } else if (!lines) {
        return <Label>There are no items in your cart.</Label>;
    }

    return (
        <div className="flex w-full flex-col gap-2">
            {lines.map((item) => {
                if (!item) return null;

                return (
                    <Suspense key={`${shop.id}.cart.lines.${item.id}`} fallback={<CartLine.skeleton />}>
                        <CartLine i18n={i18n} data={item as any} />
                    </Suspense>
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
