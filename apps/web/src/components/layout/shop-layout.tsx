import 'server-only';

import { type HTMLProps, type ReactNode, Suspense } from 'react';

import type { Shop } from '@nordcom/commerce-database';

import Footer from '@/components/Footer';
import Header from '@/components/header/header';
import PageContent from '@/components/page-content';

import type { Locale, LocaleDictionary } from '@/utils/locale';

export type ShopLayoutProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;
    children: ReactNode;
} & Omit<HTMLProps<HTMLDivElement>, 'data' | 'className'>;
const ShopLayout = ({ shop, locale, i18n, children }: ShopLayoutProps) => {
    return (
        <>
            <Suspense key={`${shop.id}.header`} fallback={<Header.skeleton />}>
                <Header shop={shop} locale={locale} i18n={i18n} />
            </Suspense>

            <Suspense key={`${shop.id}.content`} fallback={<PageContent />}>
                {children}
            </Suspense>

            <Suspense key={`${shop.id}.footer`}>
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
