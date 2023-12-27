import 'server-only';

import type { Shop } from '@/api/shop';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import PageContent from '@/components/page-content';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { Suspense, type HTMLProps, type ReactNode } from 'react';

export type PageProviderProps = {
    shop: Shop;
    locale: Locale;
    i18n: LocaleDictionary;
    children: ReactNode;
} & Omit<HTMLProps<HTMLDivElement>, 'data' | 'className'>;
const PageProvider = ({ shop, locale, i18n, children }: PageProviderProps) => {
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

PageProvider.skeleton = () => (
    <>
        <Header.skeleton />
        <PageContent />
        <Footer.skeleton />
    </>
);

PageProvider.displayName = 'Nordcom.PageProvider';
export { PageProvider };
