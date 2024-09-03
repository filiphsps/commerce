import 'server-only';

import { type HTMLProps, type ReactNode, Suspense } from 'react';

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
        <>
            <Suspense>
                <InfoBar locale={locale} i18n={i18n} shop={shop} />
            </Suspense>
            <Suspense fallback={<Header.skeleton />}>
                <Header domain={shop.domain} locale={locale} i18n={i18n} />
            </Suspense>

            <Suspense fallback={<PageContent as="main" primary={true} className="min-h-[100vh-10rem]" />}>
                {children}
            </Suspense>

            <Suspense fallback={<Footer.skeleton />}>
                <Footer shop={shop} locale={locale} i18n={i18n} />
            </Suspense>
        </>
    );
};

ShopLayout.skeleton = () => (
    <>
        <Header.skeleton />
        <PageContent as="main" primary={true} />
        <Footer.skeleton />
    </>
);

ShopLayout.displayName = 'Nordcom.Layout.ShopLayout';
export default ShopLayout;
