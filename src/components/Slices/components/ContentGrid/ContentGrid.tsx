import React, { FunctionComponent, memo } from 'react';

import Slices from '../..';
import { useRouter } from 'next/navigation';

interface ContentGridProps {
    store?: any;
    data?: {
        layout?: {
            desktop?: string;
            mobile?: string;
        };
        theme?: string;
        items?: [
            {
                href?: string;
                slices?: any;
            }
        ];
    };
    prefetch?: any;
}
const ContentGrid: FunctionComponent<ContentGridProps> = (props) => {
    const { store, data, prefetch } = props;
    const router = useRouter();

    return (
        <div className="Slice Slice-ContentGrid">
            <div
                className={`ContentGrid ContentGrid-${data?.theme || 'light'}`}
            >
                {data?.items?.map((item, index) => {
                    return (
                        <div
                            key={index}
                            className={`ContentGrid-Item ${
                                (item?.href && 'ContentGrid-Item-Href') || ''
                            }`}
                            onClick={() => {
                                if (!item?.href) return;

                                router.push(item?.href);
                            }}
                        >
                            <Slices
                                store={store}
                                data={item?.slices}
                                prefetch={prefetch}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default memo(ContentGrid);
