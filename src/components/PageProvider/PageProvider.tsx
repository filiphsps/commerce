import * as PrismicDOM from '@prismicio/helpers';

import {
    Locale,
    NextLocaleToCountry,
    NextLocaleToCurrency,
    NextLocaleToLanguage
} from '../../util/Locale';
import React, { FunctionComponent, useCallback, useState } from 'react';

import { Config } from '../../util/Config';
import Footer from '../Footer';
import Header from '../Header';
import { HeaderApi } from '../../api/header';
import HeaderNavigation from '../HeaderNavigation';
import { NavigationApi } from '../../api/navigation';
import SearchHeader from '../SearchHeader';
import { StoreModel } from '../../models/StoreModel';
import preval from '../../../src/data.preval';
import styled from 'styled-components';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useStore } from 'react-context-hook';

const Announcement = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 4rem;
    width: 100%;
    padding: 0px 1rem;
    text-transform: uppercase;
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.1rem;
    text-align: center;

    &.primary {
        background: var(--accent-primary-dark);
        color: var(--color-text-primary);

        a {
            font-weight: 800;
            text-decoration: underline;
        }
    }
    &.secondary {
        background: var(--accent-secondary);

        a {
            color: var(--accent-primary);
            font-weight: 800;
            text-decoration: underline;
        }
    }
`;
const Announcements = styled.div`
    width: 100%;
`;

interface PageProviderProps {
    store: StoreModel;
    pagePropsAnalyticsData: any;
    children: any;
    className?: string;
}
const PageProvider: FunctionComponent<PageProviderProps> = (props) => {
    const { store, pagePropsAnalyticsData } = props;

    const router = useRouter();
    const [search, setSearch] = useStore<any>('search');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { data: navigation } = useSWR([`navigation`], () => NavigationApi(router.locale), {
        fallbackData: preval.navigation
    });
    const { data: header } = useSWR(['header'], () => HeaderApi(router.locale), {
        fallbackData: preval.header
    });

    const locale = router.locale || Config.i18n.locales[0];
    const country = NextLocaleToCountry(locale);
    useAnalytics({
        locale: {
            locale: router.locale || Config.i18n.locales[0],
            language: NextLocaleToLanguage(locale),
            country,
            currency: NextLocaleToCurrency({ country, store })
        } as Locale,
        domain: Config.domain,
        shopId: store.id,
        pagePropsAnalyticsData
    });

    const onRouteChangeStart = useCallback(() => {
        setSearch({ ...search, open: false });
    }, []);

    React.useEffect(() => {
        router.events.on('routeChangeStart', onRouteChangeStart);

        return () => {
            router.events.off('routeChangeStart', onRouteChangeStart);
        };
    }, [onRouteChangeStart, router.events]);

    const above = header?.announcements.filter((item) => item.location === 'above') || [];
    const bellow = header?.announcements.filter((item) => item.location === 'bellow') || [];

    return (
        <div
            className={`PageProvider ${props.className || ''} ${
                (sidebarOpen && 'SideBar-Open') || ''
            }`}
        >
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
            <div className="HeaderWrapper">
                <Header
                    store={props?.store}
                    navigation={navigation}
                    sidebarToggle={() => setSidebarOpen(!sidebarOpen)}
                    sidebarOpen={sidebarOpen}
                />
                {(search?.open && <SearchHeader query={search?.phrase} />) || null}
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
                                    __html: PrismicDOM.asHTML(item.content) || ''
                                }}
                            />
                        </Announcement>
                    ))}
                </Announcements>
            )}

            <div
                onClick={() => {
                    // Make sure we close the search ui if the customer
                    // clicks/taps outside of it
                    if (!search.open) return;

                    setSearch({ ...search, open: false });
                }}
            >
                {props.children}
            </div>
            <Footer store={props?.store} />
        </div>
    );
};

export default PageProvider;
