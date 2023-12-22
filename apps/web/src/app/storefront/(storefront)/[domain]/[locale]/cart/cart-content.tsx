import type { Locale, LocaleDictionary } from '@/utils/locale';

import { type Shop } from '@/api/shop';
import CartLines from '@/components/cart/cart-lines';
import type { ReactNode } from 'react';
import styles from './cart-content.module.scss';
import { CartSidebar } from './cart-sidebar';

export type CartContentProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;
    header: ReactNode;
    slices: ReactNode;
};
export default function CartContent({ shop, locale, i18n, header, slices }: CartContentProps) {
    return (
        <main className={styles.container}>
            <section className={styles.content}>
                <div className={styles.lines}>
                    {header}
                    <CartLines locale={locale} i18n={i18n} />
                </div>
                <CartSidebar shop={shop} locale={locale} i18n={i18n} className={styles.sidebar} />
            </section>

            {slices}
        </main>
    );
}
