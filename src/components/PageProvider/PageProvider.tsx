import * as PrismicDOM from '@prismicio/helpers';

import { FunctionComponent, useState } from 'react';
import { Locale, NextLocaleToCurrency, NextLocaleToLocale } from '../../util/Locale';

import { Config } from '../../util/Config';
import { HeaderApi } from '../../api/header';
import { NavigationApi } from '../../api/navigation';
import type { StoreModel } from '../../models/StoreModel';
import dynamic from 'next/dynamic';
import preval from '../../../src/data.preval';
import styled from 'styled-components';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useCartUtils } from '../../hooks/useCartUtils';
import { useRouter } from 'next/router';
import useSWR from 'swr';

const Header = dynamic(() => import('@/components/Header'), {});
const HeaderNavigation = dynamic(() => import('@/components/HeaderNavigation'), {});
const Footer = dynamic(() => import('@/components/Footer'), {});

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

const Content = styled.div``;

interface PageProviderProps {
    store: StoreModel;
    pagePropsAnalyticsData: any;
    children: any;
    className?: string;
}
const PageProvider: FunctionComponent<PageProviderProps> = (props) => {
    const { store, pagePropsAnalyticsData } = props;

    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const { data: navigation } = useSWR(
        [
            'NavigationApi',
            {
                locale: router.locale
            }
        ],
        ([, props]) => NavigationApi(props),
        {
            fallbackData: preval.navigation!
        }
    );

    const { data: header } = useSWR(
        [
            'HeaderApi',
            {
                locale: router.locale
            }
        ],
        ([, props]) => HeaderApi(props),
        {
            fallbackData: preval.header!
        }
    );

    const locale = NextLocaleToLocale(router.locale);
    const { country, language } = locale;
    useAnalytics({
        locale: {
            locale: locale.locale,
            language,
            country,
            currency: NextLocaleToCurrency({ country, store })
        } as Locale,
        domain: Config.domain,
        shopId: store?.id,
        pagePropsAnalyticsData
    });
    useCartUtils({
        locale: {
            locale: locale.locale,
            language,
            country,
            currency: NextLocaleToCurrency({ country, store })
        } as Locale
    });

    const above = header?.announcements?.filter((item) => item.location === 'above') || [];
    const bellow = header?.announcements?.filter((item) => item.location === 'bellow') || [];

    // TODO: handle this way better.
    const isSliceSimulator = router.asPath === '/slice-simulator/';
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
                                __html: PrismicDOM.asHTML(item.content) || ''
                            }}
                        />
                    ))}
                </Announcements>
            )}
            <HeaderContainer>
                <Header
                    store={props?.store}
                    navigation={navigation}
                    sidebarToggle={() => setSidebarOpen(!sidebarOpen)}
                    sidebarOpen={sidebarOpen}
                />
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
                                    __html: PrismicDOM.asHTML(item.content) || ''
                                }}
                            />
                        </Announcement>
                    ))}
                </Announcements>
            )}

            <Content>{props.children}</Content>
            <Footer store={props?.store} />
        </Container>
    );
};

export default PageProvider;
