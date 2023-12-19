import 'server-only';

import { HeaderApi } from '@/api/header';
import type { Shop } from '@/api/shop';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { Page } from '@/components/layout/page';
import styles from '@/components/layout/page-provider.module.scss';
import PageContent from '@/components/page-content';
import { Content } from '@/components/typography/content';
import { PrismicText } from '@/components/typography/prismic-text';
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
    const header = await HeaderApi({ shop, locale });

    const above: any[] = header?.announcements?.filter((item: any) => item.location === 'above') || [];
    const bellow: any[] = header?.announcements?.filter((item: any) => item.location === 'bellow') || [];

    return (
        <>
            {above.length > 0 && (
                <section className={styles.announcements}>
                    {above.map((item, index) => (
                        <Content key={index} className={`${styles.announcement} background-${item.background_color}`}>
                            <PrismicText data={item.content} />
                        </Content>
                    ))}
                </section>
            )}
            <Suspense fallback={<Header.skeleton />}>
                <Header shop={shop} store={store} locale={locale} i18n={i18n} />
            </Suspense>
            {bellow.length > 0 && (
                <section className={styles.announcements}>
                    {bellow.map((item, index) => (
                        <Content key={index} className={`${styles.announcement} background-${item.background_color}`}>
                            <PrismicText data={item.content} />
                        </Content>
                    ))}
                </section>
            )}

            <Suspense
                // TODO: Find a prettier way to do this.
                fallback={
                    <Page>
                        <PageContent></PageContent>
                    </Page>
                }
            >
                {children}
            </Suspense>

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
