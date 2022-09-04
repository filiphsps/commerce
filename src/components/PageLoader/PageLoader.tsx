import React, { FunctionComponent, memo } from 'react';

import Loader from '../Loader';
import styled from 'styled-components';

const Wrapper = styled.div`
    padding: 1.5rem;
`;

interface PageLoaderProps {
    light?: boolean;
}
const PageLoader: FunctionComponent<PageLoaderProps> = ({ light }) => {
    return (
        <Wrapper className="PageLoader">
            <Loader light={light} />
        </Wrapper>
    );
};

export default memo(PageLoader);
