import React, { FunctionComponent, memo } from 'react';

import dynamic from 'next/dynamic';

const Carousel = dynamic(
    () => import(/* webpackChunkName: "carousel" */ `./components/Carousel`)
);
const Collapse = dynamic(() => import(`./components/Collapse`));
const CollectionBlock = dynamic(() => import(`./components/CollectionBlock`));
const ContentBlock = dynamic(() => import(`./components/ContentBlock`));
const ContentGrid = dynamic(() => import(`./components/ContentGrid`));
const ContentWithImage = dynamic(() => import(`./components/ContentWithImage`));
const HtmlBlock = dynamic(() => import(`./components/HtmlBlock`), {
    ssr: false
});
const Icon = dynamic(() => import(`./components/Icon`));
const ProductCard = dynamic(() => import(`./components/ProductCard`));
const SectionHeader = dynamic(() => import(`./components/SectionHeader`));
const ShopBlock = dynamic(() => import(`./components/ShopBlock`));
const TextBlock = dynamic(() => import(`./components/TextBlock`));
const Vendors = dynamic(() => import(`./components/Vendors`));

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
                        case 'ContentWithImage':
                            Component = ContentWithImage;
                            break;
                        case 'HtmlBlock':
                            Component = HtmlBlock;
                            break;
                        case 'Icon':
                            Component = Icon;
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
                        default:
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
