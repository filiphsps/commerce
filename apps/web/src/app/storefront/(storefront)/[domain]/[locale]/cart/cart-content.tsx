import type { Locale, LocaleDictionary } from '@/utils/locale';

import { type Shop } from '@/api/shop';
import { CartLines } from '@/components/cart/cart-lines';
import Breadcrumbs from '@/components/informational/breadcrumbs';
import PageContent from '@/components/page-content';
import { Suspense, type ReactNode } from 'react';
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
        <PageContent className={styles.container} primary={true}>
            <section className={styles.content}>
                <div className={styles.lines}>
                    {header}

                    <Suspense>
                        <CartLines i18n={i18n} />
                    </Suspense>
                </div>
                <CartSidebar shop={shop} locale={locale} i18n={i18n} className={styles.sidebar} />
            </section>

            <Suspense>{slices}</Suspense>

            <Breadcrumbs shop={shop} />
        </PageContent>
    );
}
