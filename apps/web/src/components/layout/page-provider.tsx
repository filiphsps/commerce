import 'server-only';

import type { Shop } from '@/api/shop';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { Page } from '@/components/layout/page';
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
const PageProvider = async ({ shop, store, locale, i18n, children }: PageProviderProps) => {
    return (
        <>
            <Suspense fallback={<Header.skeleton />}>
                <Header shop={shop} store={store} locale={locale} i18n={i18n} />
            </Suspense>

            {children}

            <Suspense>
                <Footer shop={shop} store={store} locale={locale} i18n={i18n} />
            </Suspense>
        </>
    );
};

PageProvider.skeleton = () => (
    <>
        <Header.skeleton />
        <Page>
            <PageContent></PageContent>
        </Page>
        <Footer.skeleton />
    </>
);

PageProvider.displayName = 'Nordcom.PageProvider';
export { PageProvider };
