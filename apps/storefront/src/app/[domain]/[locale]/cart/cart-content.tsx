import styles from './cart-content.module.scss';

import { Suspense } from 'react';

import type { Shop } from '@nordcom/commerce-database';

import { CartLines } from '@/components/cart/cart-lines';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import PageContent from '@/components/page-content';

import { CartSidebar } from './cart-sidebar';

import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import type { ReactNode } from 'react';

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
        <PageContent className={styles.container} primary={true}>
            <section className={styles.content}>
                <div className={styles.lines}>
                    {header}

                    {/*<Suspense key={`${shop.id}.page.cart.progress`}>
                        <FreeShippingProgress i18n={i18n} />
                    </Suspense>*/}

                    <Suspense key={`${shop.id}.page.cart.cart-lines`}>
                        <CartLines shop={shop} i18n={i18n} />
                    </Suspense>
                </div>
                <CartSidebar shop={shop} locale={locale} i18n={i18n} store={store} className={styles.sidebar} />
            </section>

            <Suspense key={`${shop.id}.page.cart.content`}>{slices}</Suspense>

            <Suspense key={`${shop.id}.page.cart.breadcrumbs`}>
                <Breadcrumbs shop={shop} />
            </Suspense>
        </PageContent>
    );
}
