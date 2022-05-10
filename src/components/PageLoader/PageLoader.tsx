import React, { FunctionComponent, memo } from 'react';

import Loader from '../Loader';
import styled from 'styled-components';

const Wrapper = styled.div`
    padding: 2rem;
`;

interface PageLoaderProps {}
const PageLoader: FunctionComponent<PageLoaderProps> = (props) => {
    return (
        <Wrapper className="PageLoader">
            <Loader />
        </Wrapper>
    );
};

export default memo(PageLoader);
