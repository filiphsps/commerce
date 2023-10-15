import { FunctionComponent } from 'react';
import Loader from '../Loader';
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
            <Loader light={light} />
        </Wrapper>
    );
};

export default PageLoader;
