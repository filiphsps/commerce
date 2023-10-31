'use client';

import type { NavigationItem } from '@/api/navigation';
import { NavigationApi } from '@/api/navigation';
import { NextLocaleToCurrency } from '@/utils/locale';
import { Suspense, useState } from 'react';

import { HeaderApi } from '@/api/header';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCartUtils } from '@/hooks/useCartUtils';
import type { FooterModel } from '@/models/FooterModel';
import type { HeaderModel } from '@/models/HeaderModel';
import type { StoreModel } from '@/models/StoreModel';
import { BuildConfig } from '@/utils/build-config';
import type { Locale } from '@/utils/locale';
import { asHTML } from '@prismicio/client';
import { usePrismicClient } from '@prismicio/react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import type { FunctionComponent } from 'react';
import styled from 'styled-components';
import useSWR from 'swr';

const Header = dynamic(() => import('@/components/Header'));
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
    font-size: 1.25rem;
    line-height: 1.5rem;
    font-weight: 700;
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

const Container = styled.div`
    overscroll-behavior-x: none;

    // TODO: Move this to a prop
    &.SideBar-Open {
        @media (max-width: 950px) {
            height: 100vh;
            height: 100dvh;
            overflow: hidden;
        }
    }
`;

const HeaderContainer = styled.div`
    position: sticky;
    z-index: 99999999;
    top: -1px;
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
    children: any;
    className?: string;
}
const PageProvider: FunctionComponent<PageProviderProps> = (props) => {
    const { store, locale, pagePropsAnalyticsData, data } = props;

    const route = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { data: navigation } = useSWR(
        [
            'NavigationApi',
            {
                locale: locale,
                client: usePrismicClient()
            }
        ],
        ([, props]) => NavigationApi(props),
        {
            fallbackData: data?.navigation
        }
    );

    const { data: header } = useSWR(
        [
            'HeaderApi',
            {
                locale: locale,
                client: usePrismicClient()
            }
        ],
        ([, props]) => HeaderApi(props),
        {
            fallbackData: data?.header
        }
    );

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

    const above = header?.announcements?.filter((item) => item.location === 'above') || [];
    const bellow = header?.announcements?.filter((item) => item.location === 'bellow') || [];

    // TODO: handle this way better.
    const isSliceSimulator = route === '/slice-simulator/';
    if (isSliceSimulator) return <>{props.children}</>;

    return (
        <Container className={`PageProvider ${props.className || ''} ${(sidebarOpen && 'SideBar-Open') || ''}`}>
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
            <HeaderContainer>
                <Suspense>
                    <Header
                        store={props?.store}
                        navigation={navigation}
                        sidebarToggle={() => setSidebarOpen(!sidebarOpen)}
                        sidebarOpen={sidebarOpen}
                    />
                </Suspense>
                <HeaderNavigation
                    navigation={navigation}
                    open={sidebarOpen}
                    toggle={(open = !sidebarOpen) => setSidebarOpen(open)}
                />
            </HeaderContainer>
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
        </Container>
    );
};

export default PageProvider;
