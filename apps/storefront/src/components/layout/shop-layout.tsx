import 'server-only';

import { type HTMLProps, type ReactNode, Suspense } from 'react';

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
            <Suspense key={`${shop.id}.layout.header`} fallback={<Header.skeleton />}>
                <Header shop={await Shop.findByDomain(shop.domain)} locale={locale} i18n={i18n} />
            </Suspense>

            <Suspense key={`${shop.id}.layout.content`} fallback={<PageContent />}>
                {children}
            </Suspense>

            <Suspense key={`${shop.id}.layout.footer`} fallback={<Footer.skeleton />}>
                <Footer shop={shop} locale={locale} i18n={i18n} />
            </Suspense>
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
