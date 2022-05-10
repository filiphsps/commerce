import React, { FunctionComponent, memo } from 'react';

import { FiChevronUp } from 'react-icons/fi';
import Scroll from 'react-scroll-up';

interface ScrollToTopProps {
    className?: string;
}
const ScrollToTop: FunctionComponent<ScrollToTopProps> = (props) => {
    return (
        <Scroll
            showUnder={10}
            style={{
                zIndex: 1,
                right: undefined,
                left: '1.5rem',
                bottom: '1.5rem'
            }}
        >
            <div className={`ScrollToTop ${props.className}`}>
                <FiChevronUp />
            </div>
        </Scroll>
    );
};

export default memo(ScrollToTop);
