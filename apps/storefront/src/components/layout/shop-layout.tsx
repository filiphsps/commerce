import 'server-only';

import { Fragment, type HTMLProps, type ReactNode, Suspense } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

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
const ShopLayout = async ({ shop, locale, i18n, children }: ShopLayoutProps) => {
    return (
        <main className="grid min-h-screen grid-cols-[100%] grid-rows-[auto_auto_1fr_auto] [grid-template-areas:'info-bar''header''content''footer']">
            <Suspense key="layout.info-bar" fallback={<Fragment />}>
                <InfoBar locale={locale} i18n={i18n} shop={shop} />
            </Suspense>
            <Suspense key="layout.header" fallback={<Header.skeleton />}>
                <Header domain={shop.domain} locale={locale} i18n={i18n} />
            </Suspense>

            <Suspense key="layout.main" fallback={<PageContent as="article" primary={true} />}>
                {children as any}
            </Suspense>

            <Suspense key="layout.footer" fallback={<Footer.skeleton />}>
                <Footer shop={shop} locale={locale} i18n={i18n} />
            </Suspense>
        </main>
    );
};

ShopLayout.skeleton = () => (
    <main className="grid min-h-screen grid-cols-[100%] grid-rows-[auto_auto_1fr_auto] [grid-template-areas:'info-bar''header''content''footer']">
        <Header.skeleton />

        <PageContent as="article" primary={true} />

        <Footer.skeleton />
    </main>
);

ShopLayout.displayName = 'Nordcom.Layout.ShopLayout';
export default ShopLayout;
