import React, { FunctionComponent } from 'react';

import CartHeader from '../CartHeader';
import SearchHeader from '../SearchHeader';
import { StoreModel } from '../../models/StoreModel';
import dynamic from 'next/dynamic';
import { useStore } from 'react-context-hook';

const Header = dynamic(() => import('../Header'));
const Footer = dynamic(() => import('../Footer'));
const HeaderNavigation = dynamic(() => import('../HeaderNavigation'));

interface PageProviderProps {
    store: StoreModel;
    children: any;
}
const PageProvider: FunctionComponent<PageProviderProps> = (props) => {
    const [search] = useStore<any>('search');

    return (
        <div className="PageProvider">
            <div className="HeaderWrapper">
                <Header store={props?.store} />
                {(search?.open && <SearchHeader query={search?.phrase} />) ||
                    null}
                <HeaderNavigation />
                <CartHeader />
            </div>
            {props.children}
            <Footer store={props?.store} />
        </div>
    );
};

export default PageProvider;
