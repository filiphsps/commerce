import React, { FunctionComponent, memo } from 'react';

import Link from '../Link';

interface HeaderNavigationProps {
    data?: any;
}
const HeaderNavigation: FunctionComponent<HeaderNavigationProps> = (props) => {
    return (
        <div className="HeaderNavigation">
            <nav className="HeaderNavigation-Content">
                {props?.data?.map((item: any, index: number) => {
                    return (
                        <Link key={index} to={item?.href}>
                            {item?.title &&
                                (item?.title?.[
                                    process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE
                                ] ||
                                    item?.title)}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default memo(HeaderNavigation);
