import styles from './cart-content.module.scss';

import { type ReactNode } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { PageApi } from '@/api/page';
import { cn } from '@/utils/tailwind';

import { CartLines } from '@/components/cart/cart-lines';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';

import { CartSidebar } from './cart-sidebar';

import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';

export type CartContentProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    header: ReactNode;

    /** @deprecated */
    store: StoreModel;
};
export default async function CartContent({ shop, locale, i18n, header, store }: CartContentProps) {
    const page = await PageApi({ shop, locale, handle: 'cart', type: 'cart_page' });

    return (
        <PageContent className={styles.container}>
            <section className={cn(styles.content, 'gap-4 lg:gap-8')}>
                <div className="flex flex-col gap-4 border-0 border-b-2 border-solid border-gray-300 md:border-0">
                    <PrismicPage
                        shop={shop}
                        locale={locale}
                        slices={page?.slices}
                        i18n={i18n}
                        handle={'cart'}
                        type={'cart_page'}
                    />

                    <div className={styles.lines}>
                        {header}

                        <CartLines shop={shop} i18n={i18n} />
                    </div>
                </div>

                <CartSidebar shop={shop} locale={locale} i18n={i18n} store={store} className={styles.sidebar}>
                    <PrismicPage
                        shop={shop}
                        locale={locale}
                        slices={page?.sidebar_slices}
                        i18n={i18n}
                        handle={'cart'}
                        type={'cart_page'}
                    />
                </CartSidebar>
            </section>

            <PrismicPage
                shop={shop}
                locale={locale}
                slices={page?.bottom_slices}
                i18n={i18n}
                handle={'cart'}
                type={'cart_page'}
            />
        </PageContent>
    );
}
