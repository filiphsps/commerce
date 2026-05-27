import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';

import { type ReactNode, Suspense } from 'react';
import { CartLines } from '@/components/cart/cart-lines';
import PageContent from '@/components/page-content';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { cn } from '@/utils/tailwind';
import styles from './cart-content.module.css';
import { CartSidebar } from './cart-sidebar';

/** Props for the `CartContent` server component. */
export type CartContentProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    header: ReactNode;
    paymentMethods?: ReactNode;
};

/**
 * Server component that composes the cart page layout: a cart lines list on
 * the left and an order summary sidebar on the right. Both sections use
 * `Suspense` so the page can stream without blocking on cart data.
 *
 * @param locale - The active locale, forwarded to `CartSidebar` for pricing display.
 * @param i18n - The locale dictionary for translated labels.
 * @param header - A slot for the cart page heading rendered above the line items.
 * @param paymentMethods - Optional slot for accepted payment method badges in the sidebar.
 * @returns The cart page content layout.
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
