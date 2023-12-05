import { NextLocaleToCurrency, NextLocaleToLocale } from '@/utils/Locale';
import { useCart } from '@shopify/hydrogen-react';
import { HeaderApi } from '@/api/header';
import { NavigationApi } from '@/api/navigation';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCartUtils } from '@/hooks/useCartUtils';
import type { StoreModel } from '@/models/StoreModel';
import { Config } from '@/utils/Config';
import type { Locale } from '@/utils/Locale';
import { asHTML } from '@prismicio/client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import type { FunctionComponent } from 'react';
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import useSWR from 'swr';
import preval from '../../data.preval';

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

    .BlackFriday & {
        &.primary,
        &.secondary {
            background: #000 !important;
            color: #ccc !important;
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
    pagePropsAnalyticsData: any;
    children: any;
    className?: string;
    events?: {
        events: string[],
        setEvents: any
    }
}
const PageProvider: FunctionComponent<PageProviderProps> = (props) => {
    const { store, pagePropsAnalyticsData } = props;

    const cart = useCart();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!props.events || !cart || cart.status !== 'idle') return;

        const { events, setEvents } = props.events;
        if (!events || events.length <= 0) return;

        setEvents((events) => {
            events.forEach((event) => {
                switch(event) {
                    case 'remove_from_cart': {
                        try {
                            // Google Tracking
                            (window as any).dataLayer?.push(
                                {
                                    ecommerce: null
                                },
                                {
                                    event: 'remove_from_cart',
                                    ecommerce: {
                                        currency: cart.cost?.totalAmount?.currencyCode! || 'USD',
                                        value: 0, // TODO: Get the value of the removed items.
                                        items: [] // TODO: Get the removed items.
                                    }
                                }
                            );
                        } catch {}
                        return;
                    }
                    default: {
                        console.warn(`Unknown event "${event}" triggered!`);
                        return;
                    }
                }
            });
            return [];
        });
    }, [props.events])

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
                                __html: asHTML(item.content) || ''
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
                                    __html: asHTML(item.content) || ''
                                }}
                            />
                        </Announcement>
                    ))}
                </Announcements>
            )}

            {props.children}
            <Footer store={props?.store} />
        </Container>
    );
};

export default PageProvider;
