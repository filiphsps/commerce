'use client';

import type { NavigationItem } from '@/api/navigation';
import Footer from '@/components/Footer';
import styles from '@/components/PageProvider/page-provider.module.scss';
import { Content } from '@/components/typography/content';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCartUtils } from '@/hooks/useCartUtils';
import type { FooterModel } from '@/models/FooterModel';
import type { HeaderModel } from '@/models/HeaderModel';
import type { StoreModel } from '@/models/StoreModel';
import type { Locale, LocaleDictionary } from '@/utils/locale';
import { NextLocaleToCurrency } from '@/utils/locale';
import { asHTML } from '@prismicio/client';
import type { FunctionComponent, ReactNode } from 'react';
import styled from 'styled-components';

const Announcement = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: var(--block-padding-large);
    text-transform: uppercase;
    font-size: 1.5rem;
    line-height: default;
    font-weight: 600;
    text-align: center;

    @media (min-width: 950px) {
        font-size: 1.25rem;
        line-height: 1.2;
    }

    & p {
        font-size: inherit;
        font-weight: inherit;
    }

    &.primary {
        background: var(--accent-primary-dark);
        color: var(--accent-primary-text);

        a {
            font-weight: 800;
            text-decoration: underline;
        }
    }
    &.secondary {
        background: var(--accent-secondary);
        color: var(--accent-secondary-text);

        a {
            color: var(--accent-primary);
            font-weight: 800;
            text-decoration: underline;
        }
    }
`;
const Announcements = styled.div`
    z-index: 5;
    width: 100%;
`;

interface PageProviderProps {
    store: StoreModel;
    domain: string;
    locale: Locale;
    i18n: LocaleDictionary;
    pagePropsAnalyticsData: any;
    data: {
        navigation: NavigationItem[];
        header: HeaderModel;
        footer: FooterModel;
    };
    children: ReactNode;
    header: ReactNode;
    className?: string;
}
const PageProvider: FunctionComponent<PageProviderProps> = (props) => {
    const { store, domain, locale, i18n, pagePropsAnalyticsData, data, header: headerComponent } = props;
    const { header } = data as any;

    const { country } = locale;
    useAnalytics({
        locale: {
            ...locale,
            currency: NextLocaleToCurrency({ country, store }) // FIXME: Remove this when `NextLocaleToCurrency` works.
        } as Locale,
        domain,
        shopId: store?.id,
        pagePropsAnalyticsData
    });
    useCartUtils({
        locale: {
            ...locale,
            currency: NextLocaleToCurrency({ country, store }) // FIXME: Remove this when `NextLocaleToCurrency` works.
        } as Locale
    });

    const above: any[] = header?.announcements?.filter((item: any) => item.location === 'above') || [];
    const bellow: any[] = header?.announcements?.filter((item: any) => item.location === 'bellow') || [];

    return (
        <div className={`${styles.container} ${props.className || ''}`}>
            {above.length > 0 && (
                <Announcements>
                    {above.map((item, index) => (
                        <Announcement key={index} className={item.background_color}>
                            <Content
                                dangerouslySetInnerHTML={{
                                    __html: asHTML(item.content) || ''
                                }}
                            />
                        </Announcement>
                    ))}
                </Announcements>
            )}
            <div className={styles.header}>{headerComponent}</div>
            {bellow.length > 0 && (
                <Announcements>
                    {bellow.map((item, index) => (
                        <Announcement key={index} className={item.background_color}>
                            <Announcement key={index} className={item.background_color}>
                                <Content
                                    dangerouslySetInnerHTML={{
                                        __html: asHTML(item.content) || ''
                                    }}
                                />
                            </Announcement>
                        </Announcement>
                    ))}
                </Announcements>
            )}

            {props.children}
            <Footer store={props.store} data={data.footer} locale={locale} i18n={i18n} />
        </div>
    );
};

export default PageProvider;
