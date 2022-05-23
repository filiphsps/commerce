import React, { FunctionComponent, memo } from 'react';

import Link from '../Link';
import { NavigationApi } from '../../api/navigation';
import useSWR from 'swr';

interface HeaderNavigationProps {}
const HeaderNavigation: FunctionComponent<HeaderNavigationProps> = () => {
    const { data } = useSWR([`navigation`], () => NavigationApi() as any, {});

    return (
        <div className="HeaderNavigation">
            <nav className="HeaderNavigation-Content">
                {data?.map((item: any, index: number) => {
                    return (
                        <Link key={index} to={`/${item?.handle || ''}`}>
                            {item?.title}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default memo(HeaderNavigation);
