'use client';

import type { NavigationItem } from '@/api/navigation';
import styles from '@/components/PageProvider/page-provider.module.css';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCartUtils } from '@/hooks/useCartUtils';
import type { FooterModel } from '@/models/FooterModel';
import type { HeaderModel } from '@/models/HeaderModel';
import type { StoreModel } from '@/models/StoreModel';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { NextLocaleToCurrency } from '@/utils/locale';
import { asHTML } from '@prismicio/client';
import dynamic from 'next/dynamic';
import type { FunctionComponent, ReactNode } from 'react';
import { useState } from 'react';
import styled from 'styled-components';

const HeaderNavigation = dynamic(() => import('@/components/HeaderNavigation'));
const Footer = dynamic(() => import('@/components/Footer'));

const Announcement = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: var(--block-padding-large);
    text-transform: uppercase;
    font-size: 1.45rem;
    line-height: 1.2;
    font-weight: 600;
    text-align: center;

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
    z-index: 9999;
    width: 100%;
`;

interface PageProviderProps {
    store: StoreModel;
    locale: Locale;
    pagePropsAnalyticsData: any;
    data?: {
        navigation?: NavigationItem[];
        header?: HeaderModel;
        footer?: FooterModel;
    };
    children: ReactNode;
    header: ReactNode;
    className?: string;
}
const PageProvider: FunctionComponent<PageProviderProps> = (props) => {
    const { store, locale, pagePropsAnalyticsData, data, header: headerComponent } = props;
    const { navigation, header } = data as any;

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { country } = locale;
    useAnalytics({
        locale: {
            ...locale,
            currency: NextLocaleToCurrency({ country, store }) // FIXME: Remove this when `NextLocaleToCurrency` works.
        } as Locale,
        domain: BuildConfig.domain,
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
        <div className={`${styles.container} ${props.className || ''} ${(sidebarOpen && 'SideBar-Open') || ''}`}>
            {above.length > 0 && (
                <Announcements>
                    {above.map((item, index) => (
                        <Announcement
                            key={index}
                            className={item.background_color}
                            dangerouslySetInnerHTML={{
                                __html: asHTML(item.content) || ''
                            }}
                        />
                    ))}
                </Announcements>
            )}
            <div className={styles.header}>
                {headerComponent}
                <HeaderNavigation
                    navigation={navigation}
                    open={sidebarOpen}
                    toggle={(open = !sidebarOpen) => setSidebarOpen(open)}
                />
            </div>
            {bellow.length > 0 && (
                <Announcements>
                    {bellow.map((item, index) => (
                        <Announcement key={index} className={item.background_color}>
                            <Announcement
                                key={index}
                                className={item.background_color}
                                dangerouslySetInnerHTML={{
                                    __html: asHTML(item.content) || ''
                                }}
                            />
                        </Announcement>
                    ))}
                </Announcements>
            )}

            {props.children}
            <Footer store={props?.store} locale={locale} data={data?.footer} />
        </div>
    );
};

export default PageProvider;
