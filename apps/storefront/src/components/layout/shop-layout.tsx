import 'server-only';

import { type HTMLProps, type ReactNode } from 'react';

import type { OnlineShop } from '@nordcom/commerce-db';

import Footer from '@/components/Footer';
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
            <InfoBar locale={locale} i18n={i18n} shop={shop} />
            <Header domain={shop.domain} locale={locale} i18n={i18n} />

            {children}

            <Footer shop={shop} locale={locale} i18n={i18n} />
        </>
    );
};

ShopLayout.skeleton = () => (
    <>
        <Header.skeleton />
        <PageContent />
        <Footer.skeleton />
    </>
);

ShopLayout.displayName = 'Nordcom.Layout.ShopLayout';
export default ShopLayout;
