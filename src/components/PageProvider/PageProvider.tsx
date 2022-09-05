import React, { FunctionComponent, useCallback } from 'react';

import CartHeader from '../CartHeader';
import Footer from '../Footer';
import Header from '../Header';
import HeaderNavigation from '../HeaderNavigation';
import { NavigationApi } from '../../api/navigation';
import SearchHeader from '../SearchHeader';
import { StoreModel } from '../../models/StoreModel';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { useStore } from 'react-context-hook';

interface PageProviderProps {
    store: StoreModel;
    children: any;
}
const PageProvider: FunctionComponent<PageProviderProps> = (props) => {
    const router = useRouter();
    const [search, setSearch] = useStore<any>('search');
    const { data: navigation } = useSWR(
        [`navigation`],
        () => NavigationApi() as any,
        {}
    );

    const onRouteChangeStart = useCallback(() => {
        setSearch({ ...search, open: false });
    }, []);

    React.useEffect(() => {
        router.events.on('routeChangeStart', onRouteChangeStart);

        return () => {
            router.events.off('routeChangeStart', onRouteChangeStart);
        };
    }, [onRouteChangeStart, router.events]);

    return (
        <div className="PageProvider">
            <div className="HeaderWrapper">
                <Header store={props?.store} navigation={navigation} />
                {(search?.open && <SearchHeader query={search?.phrase} />) ||
                    null}
                <HeaderNavigation navigation={navigation} />
                <CartHeader />
            </div>
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
