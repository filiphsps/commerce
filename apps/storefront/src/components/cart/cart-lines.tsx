'use client';

import { useCartActions, useCartCount, useCartLines as useCartLinesSlice, useCartStatus } from '@nordcom/cart-react';
import { Suspense } from 'react';
import { Button } from '@/components/actionable/button';
import { ExportCartButton } from '@/components/actionable/export-cart-button';
import { CartEmpty } from '@/components/cart/cart-empty';
import { CartLine } from '@/components/cart/cart-line';
import { getTranslations, type LocaleDictionary } from '@/utils/locale';

type CartContentProps = {
    i18n: LocaleDictionary;
};
/**
 * Renders all lines in the current cart with clear-cart and CSV export controls.
 *
 * @param props.i18n - Locale dictionary for translated labels.
 * @returns The cart line list, a skeleton while loading, or the empty-cart state.
 */
const CartLines = ({ i18n }: CartContentProps) => {
    const { t: tCart } = getTranslations('cart', i18n);

    const { cartReady } = useCartStatus();
    const { lines } = useCartLinesSlice();
    const totalQuantity = useCartCount();
    const { clear } = useCartActions();

    if (!cartReady) {
        return <CartLines.skeleton />;
    }

    if (lines.length <= 0 || !totalQuantity || totalQuantity <= 0) {
        return <CartEmpty i18n={i18n} />;
    }

    return (
        <div className="flex w-full flex-col gap-(--block-spacer)">
            <div className="text-(color:var(--text-muted)) flex w-full items-center justify-between border-(--border-default) border-0 border-b border-solid pb-1 md:border-0 md:px-1 md:pb-0">
                <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="font-bold"
                    onClick={() => void clear()}
                >
                    {tCart('clear-cart')}
                </Button>

                <ExportCartButton i18n={i18n} />
            </div>

            {/* No `list-none`: the flex container already suppresses `<li>` markers, and keeping the
             * default list-style preserves the list role in Safari (which drops it under
             * `list-style: none`) — so the cart still announces as a list of N items everywhere. */}
            <ul
                aria-label={tCart('products')}
                className="flex h-full w-full flex-col gap-(--block-spacer-large) empty:hidden md:gap-(--block-spacer-large)"
            >
                {lines.map((item) => {
                    if (!item) {
                        return null;
                    }

                    return (
                        <li key={item.id}>
                            <Suspense fallback={<CartLine.skeleton />}>
                                <CartLine i18n={i18n} data={item} />
                            </Suspense>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

CartLines.skeleton = () => {
    return (
        <section className="flex w-full flex-col gap-1">
            <div className={'h-24 w-full rounded-lg bg-(--surface-1) p-4'} data-skeleton />
            <div className={'h-24 w-full rounded-lg bg-(--surface-1) p-4'} data-skeleton />
            <div className={'h-24 w-full rounded-lg bg-(--surface-1) p-4'} data-skeleton />
        </section>
    );
};

CartLines.displayName = 'Nordcom.Cart.Lines';

export { CartLines };
