import type { FunctionComponent } from 'react';
import styled from 'styled-components';
import { LoadingIndicator } from '../informational/loading-indicator';

const Wrapper = styled.div`
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--block-padding-large);
`;

interface PageLoaderProps {
    light?: boolean;
}
const PageLoader: FunctionComponent<PageLoaderProps> = ({ light }) => {
    return (
        <Wrapper className="PageLoader">
            <LoadingIndicator />
        </Wrapper>
    );
};

export default PageLoader;
