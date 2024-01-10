import type { Locale, LocaleDictionary } from '@/utils/locale';

import { CartLines } from '@/components/cart/cart-lines';
import { FreeShippingProgress } from '@/components/cart/free-shipping-progress';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import PageContent from '@/components/page-content';
import type { StoreModel } from '@/models/StoreModel';
import { type Shop } from '@nordcom/commerce-database';
import { Suspense, type ReactNode } from 'react';
import styles from './cart-content.module.scss';
import { CartSidebar } from './cart-sidebar';

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

                    <Suspense>
                        <FreeShippingProgress i18n={i18n} />
                    </Suspense>

                    <Suspense>
                        <CartLines i18n={i18n} />
                    </Suspense>
                </div>
                <CartSidebar shop={shop} locale={locale} i18n={i18n} store={store} className={styles.sidebar} />
            </section>

            <Suspense>{slices}</Suspense>

            <Suspense>
                <Breadcrumbs shop={shop} />
            </Suspense>
        </PageContent>
    );
}
