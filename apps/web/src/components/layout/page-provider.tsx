import 'server-only';

import type { Shop } from '@/api/shop';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import PageContent from '@/components/page-content';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { Suspense, type HTMLProps, type ReactNode } from 'react';

export type PageProviderProps = {
    shop: Shop;
    store: StoreModel;
    locale: Locale;
    i18n: LocaleDictionary;
    children: ReactNode;
} & Omit<HTMLProps<HTMLDivElement>, 'data' | 'className'>;
const PageProvider = ({ shop, store, locale, i18n, children }: PageProviderProps) => {
    return (
        <>
            <Suspense key={`${shop.id}.header`} fallback={<Header.skeleton />}>
                <Header shop={shop} locale={locale} i18n={i18n} />
            </Suspense>
            {children}
            <Suspense key={`${shop.id}.footer`}>
                <Footer shop={shop} store={store} locale={locale} i18n={i18n} />
            </Suspense>
        </>
    );
};

PageProvider.skeleton = () => (
    <>
        <Header.skeleton />
        <PageContent />
        <Footer.skeleton />
    </>
);

PageProvider.displayName = 'Nordcom.PageProvider';
export { PageProvider };
