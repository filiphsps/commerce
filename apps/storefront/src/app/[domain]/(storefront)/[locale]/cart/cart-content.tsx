import styles from './cart-content.module.scss';

import { type ReactNode } from 'react';

import type { Shop } from '@nordcom/commerce-database';

import { CartLines } from '@/components/cart/cart-lines';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import PageContent from '@/components/page-content';

import { CartSidebar } from './cart-sidebar';

import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type CartContentProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;
    header: ReactNode;
    slices: ReactNode;

    /** @deprecated */
    store: StoreModel;
};
export default function CartContent({ shop, locale, i18n, header, slices, store }: CartContentProps) {
    return (
        <PageContent className={styles.container}>
            <section className={styles.content}>
                <div className={styles.lines}>
                    {header}

                    <CartLines shop={shop} i18n={i18n} />
                </div>

                <CartSidebar shop={shop} locale={locale} i18n={i18n} store={store} className={styles.sidebar} />
            </section>

            {slices}

            <Breadcrumbs shop={shop} />
        </PageContent>
    );
}
