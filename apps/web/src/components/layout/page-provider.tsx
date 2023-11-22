import type { NavigationItem } from '@/api/navigation';
import type { Shop } from '@/api/shop';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import styles from '@/components/layout/page-provider.module.scss';
import { Content } from '@/components/typography/content';
import { PrismicText } from '@/components/typography/prismic-text';
import type { FooterModel } from '@/models/FooterModel';
import type { HeaderModel } from '@/models/HeaderModel';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { Suspense, type HTMLProps, type ReactNode } from 'react';

export type PageProviderProps = {
    shop: Shop;
    store: StoreModel;
    locale: Locale;
    i18n: LocaleDictionary;
    data: {
        navigation: NavigationItem[];
        header: HeaderModel;
        footer: FooterModel;
    };
    children: ReactNode;
} & Omit<HTMLProps<HTMLDivElement>, 'data' | 'className'>;
export const PageProvider = ({
    store,
    locale,
    i18n,
    data: { header, navigation, footer },
    children
}: PageProviderProps) => {
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
            <Suspense>
                <Header store={store} navigation={navigation} locale={locale} i18n={i18n} className={styles.header} />
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

            {children}

            <Suspense>
                <Footer store={store} locale={locale} i18n={i18n} data={footer} />
            </Suspense>
        </>
    );
};
