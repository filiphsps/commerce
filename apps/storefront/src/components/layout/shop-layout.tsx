import 'server-only';

import type { OnlineShop } from '@nordcom/commerce-db';
import { Fragment, type HTMLProps, type ReactNode, Suspense } from 'react';

import Footer from '@/components/footer/footer';
import Header from '@/components/header/header';
import { InfoBar } from '@/components/header/info-bar';
import PageContent from '@/components/page-content';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ShopLayoutProps = {
    shop: OnlineShop;
    locale: Locale;
    i18n: LocaleDictionary;
    children: ReactNode;
} & Omit<HTMLProps<HTMLDivElement>, 'data' | 'className'>;

/**
 * Async server component composing the full-page grid layout with info-bar, header, content, and footer.
 *
 * @param props.shop - Shop record forwarded to all child layout components.
 * @param props.locale - Active locale forwarded to all child layout components.
 * @param props.i18n - Locale dictionary forwarded to all child layout components.
 * @param props.children - Main page content rendered in the content grid area.
 * @returns The main grid container element.
 */
const ShopLayout = async ({ shop, locale, i18n, children }: ShopLayoutProps) => {
    return (
        <main className="grid min-h-screen grid-cols-[100%] grid-rows-[auto_auto_1fr_auto] [grid-template-areas:'info-bar''header''content''footer']">
            <Suspense key="layout.info-bar" fallback={<Fragment />}>
                <InfoBar shop={shop} locale={locale} i18n={i18n} />
            </Suspense>

            <Suspense key="layout.header" fallback={<Header.skeleton />}>
                <Header domain={shop.domain} locale={locale} i18n={i18n} />
            </Suspense>

            <Suspense key="layout.main" fallback={<PageContent as="article" primary={true} />}>
                {children}
            </Suspense>

            <Suspense key="layout.footer" fallback={<Footer.skeleton />}>
                <Footer shop={shop} locale={locale} i18n={i18n} />
            </Suspense>
        </main>
    );
};

ShopLayout.skeleton = () => (
    <main className="grid min-h-screen grid-cols-[100%] grid-rows-[auto_auto_1fr_auto] [grid-template-areas:'info-bar''header''content''footer']">
        <div></div>
        <Header.skeleton />
        <PageContent as="article" primary={true} />
        <Footer.skeleton />
    </main>
);

ShopLayout.displayName = 'Nordcom.Layout.ShopLayout';
export default ShopLayout;
