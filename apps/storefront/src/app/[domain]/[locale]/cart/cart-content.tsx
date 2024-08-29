import styles from './cart-content.module.scss';

import { type ReactNode, Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import { PageApi } from '@/api/page';
import { cn } from '@/utils/tailwind';

import { CartLines } from '@/components/cart/cart-lines';
import PageContent from '@/components/page-content';
import PrismicPage from '@/components/prismic-page';

import { CartSidebar } from './cart-sidebar';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type CartContentProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    header: ReactNode;
    paymentMethods?: ReactNode;
};
export default async function CartContent({ shop, locale, i18n, header, paymentMethods = null }: CartContentProps) {
    const page = await PageApi({ shop, locale, handle: 'cart', type: 'cart_page' });

    return (
        <PageContent className={styles.container}>
            <section className={cn(styles.content, 'gap-4 lg:gap-8')}>
                <div className="flex flex-col gap-4">
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

                        <Suspense fallback={<CartLines.skeleton />}>
                            <CartLines i18n={i18n} />
                        </Suspense>
                    </div>
                </div>

                <Suspense fallback={<aside className={cn(styles.sidebar, 'h-32')} data-skeleton />}>
                    <CartSidebar
                        shop={shop}
                        locale={locale}
                        i18n={i18n}
                        className={styles.sidebar}
                        paymentMethods={paymentMethods}
                    >
                        <PrismicPage
                            shop={shop}
                            locale={locale}
                            slices={page?.sidebar_slices}
                            i18n={i18n}
                            handle={'cart'}
                            type={'cart_page'}
                        />
                    </CartSidebar>
                </Suspense>
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
