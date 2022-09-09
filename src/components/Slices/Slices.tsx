import React, { FunctionComponent, memo } from 'react';

import Collapse from './components/Collapse';
import ContentBlock from './components/ContentBlock';
import ContentGrid from './components/ContentGrid';
import IconGrid from './components/IconGrid';
import ImageLinks from './components/ImageLinks';
import Notification from './components/Notification';
import ProductCard from './components/ProductCard';
import SectionHeader from './components/SectionHeader';
import TextBlock from './components/TextBlock';
import Vendors from './components/Vendors';
import dynamic from 'next/dynamic';

const Carousel = dynamic(() => import('./components/Carousel'));
const CollectionBlock = dynamic(() => import('./components/CollectionBlock'));
const ShopBlock = dynamic(() => import('./components/ShopBlock'));

interface SlicesProps {
    store?: any;
    data?: any;
    prefetch?: any;
    country?: string;
}
const Slices: FunctionComponent<SlicesProps> = (props) => {
    const slices = props?.data || [];

    if (!slices.length) return null;

    return (
        <div className="Slices">
            {slices?.map((item, index) => {
                if (item?.disabled) return null;

                try {
                    // SSR: work-around
                    // we previously dynamically imported components from /Slices/components,
                    //   but that prevented SSR from working.

                    let Component = null;
                    const type = item?.type || item?.slice_type;
                    switch (type) {
                        case 'carousel':
                            Component = Carousel;
                            break;
                        case 'Collapse':
                        case 'collapse':
                            Component = Collapse;
                            break;
                        case 'CollectionBlock':
                        case 'collection':
                            Component = CollectionBlock;
                            break;
                        case 'contentblock':
                            Component = ContentBlock;
                            break;
                        case 'ContentGrid':
                            Component = ContentGrid;
                            break;
                        case 'ProductCard':
                            Component = ProductCard;
                            break;
                        case 'SectionHeader':
                            Component = SectionHeader;
                            break;
                        case 'shopblock':
                            Component = ShopBlock;
                            break;
                        case 'textblock':
                            Component = TextBlock;
                            break;
                        case 'vendors':
                            Component = Vendors;
                            break;
                        case 'notification':
                            Component = Notification;
                            break;
                        case 'icon_grid':
                            Component = IconGrid;
                            break;
                        case 'imagelinks':
                            Component = ImageLinks;
                            break;
                        default:
                            console.warn(`Invalid slice "${type}"`);
                            return null;
                    }

                    return (
                        <Component
                            key={index}
                            store={props?.store}
                            data={
                                item?.data || {
                                    primary: item?.primary,
                                    items: item?.items
                                }
                            }
                            index={index}
                            prefetch={props?.prefetch}
                        />
                    );
                } catch (err) {
                    console.error(err);
                    return null;
                }
            })}
        </div>
    );
};

export default memo(Slices);
