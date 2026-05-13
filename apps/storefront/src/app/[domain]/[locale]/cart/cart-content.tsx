import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';

import { type ReactNode, Suspense } from 'react';
import { CartLines } from '@/components/cart/cart-lines';
import PageContent from '@/components/page-content';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import styles from './cart-content.module.scss';
import { CartSidebar } from './cart-sidebar';

export type CartContentProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    header: ReactNode;
    paymentMethods?: ReactNode;
};

/**
 * Cart-page CMS overlays (top/sidebar/bottom slices) were sourced from
 * Prismic. With Prismic removed, the cart page renders without overlay
 * content until a Cart page Block type is added to @nordcom/commerce-cms.
 */
export default async function CartContent({ locale, i18n, header, paymentMethods = null }: CartContentProps) {
    return (
        <PageContent className={styles.container}>
            <section className={cn(styles.content, 'gap-4 lg:gap-8')}>
                <div className="flex flex-col gap-4">
                    <div className={cn(styles.lines, 'flex flex-col gap-3')} suppressHydrationWarning={true}>
                        {header}

                        <Suspense>
                            <CartLines i18n={i18n} />
                        </Suspense>
                    </div>
                </div>

                <Suspense fallback={<aside className={cn(styles.sidebar, 'h-32')} data-skeleton />}>
                    <CartSidebar locale={locale} i18n={i18n} className={styles.sidebar} paymentMethods={paymentMethods}>
                        {null}
                    </CartSidebar>
                </Suspense>
            </section>
        </PageContent>
    );
}
