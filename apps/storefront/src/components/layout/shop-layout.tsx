import 'server-only';

import { type HTMLProps, type ReactNode } from 'react';

import type { Shop as ShopModel } from '@nordcom/commerce-database';
import { Shop } from '@nordcom/commerce-db';

import Footer from '@/components/Footer';
import Header from '@/components/header/header';
import PageContent from '@/components/page-content';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ShopLayoutProps = {
    shop: ShopModel;
    locale: Locale;
    i18n: LocaleDictionary;
    children: ReactNode;
} & Omit<HTMLProps<HTMLDivElement>, 'data' | 'className'>;
const ShopLayout = async ({ shop, locale, i18n, children }: ShopLayoutProps) => {
    return (
        <>
            {/*<Header shop={await Shop.findByDomain(shop.domain)} locale={locale} i18n={i18n} />*/}
            <Header shop={await Shop.findByDomain(shop.domain)} locale={locale} i18n={i18n} />

            {children}

            <Footer shop={shop} locale={locale} i18n={i18n} />
        </>
    );
};

ShopLayout.skeleton = () => (
    <>
        {/*TODO: Skeleton for this.*/}
        <header />
        <PageContent />
        <Footer.skeleton />
    </>
);

ShopLayout.displayName = 'Nordcom.Layout.ShopLayout';
export default ShopLayout;
