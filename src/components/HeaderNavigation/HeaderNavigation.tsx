import React, { FunctionComponent, memo } from 'react';

import Link from '../Link';

interface HeaderNavigationProps {
    navigation: any;
}
const HeaderNavigation: FunctionComponent<HeaderNavigationProps> = ({
    navigation
}) => {
    return (
        <div className="HeaderNavigation">
            <nav className="HeaderNavigation-Content">
                {navigation?.map((item: any, index: number) => {
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
