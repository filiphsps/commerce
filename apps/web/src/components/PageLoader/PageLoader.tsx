import { LoadingIndicator } from '@/components/informational/loading-indicator';
import type { FunctionComponent } from 'react';
import styled from 'styled-components';

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
